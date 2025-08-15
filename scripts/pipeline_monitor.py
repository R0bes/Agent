#!/usr/bin/env python3
"""Pipeline monitoring script for Chat Backend Agent CI/CD pipelines.

Fixes vs. previous version:
- Always list jobs via `GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs`
- Download logs via `GET /repos/{owner}/{repo}/actions/jobs/{job_id}/logs`
- Robust headers (User-Agent, API version) and token handling
- Pagination for jobs
- Better failure summary + graceful handling of permission issues (403/404)
"""

import argparse
import io
import os
import subprocess
import sys
import time
import zipfile
from datetime import datetime
from typing import Any, Dict, List, Optional

import requests


class PipelineMonitor:
    """Monitor CI/CD pipeline status and provide feedback."""

    def __init__(
        self,
        repo_owner: str = "robin",
        repo_name: str = "Agent",
        workflow_name: str = "CI/CD Pipeline",
    ):
        self.repo_owner = repo_owner
        self.repo_name = repo_name
        self.workflow_name = workflow_name
        self.github_token = self._get_github_token()
        self.base_url = f"https://api.github.com/repos/{self.repo_owner}/{self.repo_name}"

    # ---------------------------
    # Low-level helpers
    # ---------------------------

    def _headers(self) -> Dict[str, str]:
        """Standard headers for GitHub API."""
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "PipelineMonitor/1.0",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if self.github_token:
            headers["Authorization"] = f"Bearer {self.github_token}"
        return headers

    def _get_github_token(self) -> Optional[str]:
        """Get GitHub token from environment or git config."""
        # 1) Environment
        token = os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN")
        if token:
            return token.strip()

        # 2) git config --global github.token
        for args in (["git", "config", "--global", "github.token"], ["git", "config", "github.token"]):
            try:
                result = subprocess.run(args, capture_output=True, text=True, check=True)
                val = result.stdout.strip()
                if val:
                    return val
            except subprocess.CalledProcessError:
                pass
        return None

    # ---------------------------
    # Git helpers
    # ---------------------------

    def get_current_branch(self) -> str:
        """Get current git branch."""
        try:
            result = subprocess.run(
                ["git", "branch", "--show-current"],
                capture_output=True,
                text=True,
                check=True,
            )
            branch = result.stdout.strip()
            return branch or "main"
        except subprocess.CalledProcessError:
            return "main"

    def get_last_commit_sha(self) -> str:
        """Get the SHA of the last commit (full)."""
        try:
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"], capture_output=True, text=True, check=True
            )
            return result.stdout.strip()
        except subprocess.CalledProcessError:
            return ""

    # ---------------------------
    # GitHub API (runs, jobs, logs)
    # ---------------------------

    def get_workflow_runs(self, branch: str, commit_sha: str = "") -> List[Dict[str, Any]]:
        """Get workflow runs for a specific branch; optionally filter to a commit SHA."""
        if not self.github_token:
            print("WARNING: No GitHub token found. Cannot check private pipeline status.")
            print("   Set GITHUB_TOKEN (or GH_TOKEN) env var or configure git config github.token")
            return []

        try:
            # Pull a few pages to be safe
            runs: List[Dict[str, Any]] = []
            page = 1
            while page <= 3:
                resp = requests.get(
                    f"{self.base_url}/actions/runs",
                    headers=self._headers(),
                    params={"branch": branch, "per_page": 50, "page": page},
                    timeout=20,
                )
                resp.raise_for_status()
                batch = resp.json().get("workflow_runs", []) or []
                runs.extend(batch)
                if len(batch) < 50:
                    break
                page += 1

            # Filter for our unified CI/CD pipeline by name
            filtered = [r for r in runs if r.get("name") == self.workflow_name]

            # If a commit SHA is specified, try to match exactly
            if commit_sha:
                exact = [r for r in filtered if r.get("head_sha") == commit_sha]
                if exact:
                    return exact[:1]  # most recent matching
            # Otherwise return most recent by default
            return filtered
        except requests.RequestException as e:
            print(f"Error fetching workflow runs: {e}")
            return []

    def get_workflow_details(self, workflow_id: int) -> Optional[dict]:
        """Get detailed information about a specific workflow run."""
        try:
            resp = requests.get(
                f"{self.base_url}/actions/runs/{workflow_id}",
                headers=self._headers(),
                timeout=15,
            )
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as e:
            print(f"Error fetching workflow details: {e}")
            return None

    def get_workflow_jobs(self, workflow_id: int) -> List[dict]:
        """List all jobs for a given workflow run (handles pagination)."""
        jobs: List[dict] = []
        page = 1
        while True:
            try:
                resp = requests.get(
                    f"{self.base_url}/actions/runs/{workflow_id}/jobs",
                    headers=self._headers(),
                    params={"per_page": 100, "page": page},
                    timeout=20,
                )
                resp.raise_for_status()
                batch = resp.json().get("jobs", []) or []
                jobs.extend(batch)
                if len(batch) < 100:
                    break
                page += 1
            except requests.RequestException as e:
                print(f"Error fetching workflow jobs: {e}")
                break
        return jobs

    def get_job_logs_by_id(self, job_id: int, max_lines: int = 400) -> List[str]:
        """Download logs for a single job. Handles redirect and zipped content."""
        try:
            resp = requests.get(
                f"{self.base_url}/actions/jobs/{job_id}/logs",
                headers=self._headers(),
                allow_redirects=True,
                timeout=60,
            )
            # If unauthorized for job logs (e.g., fork PR), surface a clear note
            if resp.status_code == 403:
                print("⚠️  GitHub API returned 403 for job logs (permissions).")
                return []
            if resp.status_code == 404:
                print("⚠️  Job logs not found (404).")
                return []

            resp.raise_for_status()

            ctype = (resp.headers.get("Content-Type") or "").lower()
            if "application/zip" in ctype:
                # Some endpoints return zip archives. Extract all text parts.
                lines: List[str] = []
                with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
                    for name in zf.namelist():
                        try:
                            content = zf.read(name).decode("utf-8", errors="replace")
                            lines.extend(content.splitlines())
                        except Exception:
                            continue
                if max_lines and len(lines) > max_lines:
                    return lines[-max_lines:]
                return lines

            # Otherwise assume plain text
            text = resp.text or ""
            lines = text.splitlines()
            if max_lines and len(lines) > max_lines:
                return lines[-max_lines:]
            return lines

        except requests.RequestException as e:
            print(f"Error fetching job logs: {e}")
            return []

    # ---------------------------
    # Log analysis
    # ---------------------------

    def extract_error_summary(self, logs: List[str]) -> str:
        """Extract a summary of the most important error from logs."""
        if not logs:
            return "No logs available"

        for line in logs:
            l = line.lower()
            # Python-specific
            if "syntaxerror:" in l:
                return f"Syntax Error: {line.strip()}"
            if "importerror:" in l:
                return f"Import Error: {line.strip()}"
            if "modulenotfounderror:" in l:
                return f"Module Not Found: {line.strip()}"
            if "attributeerror:" in l:
                return f"Attribute Error: {line.strip()}"
            if "typeerror:" in l:
                return f"Type Error: {line.strip()}"
            if "nameerror:" in l:
                return f"Name Error: {line.strip()}"

            # General
            if "traceback" in l:
                return f"Traceback: {line.strip()}"
            if "exception" in l:
                return f"Exception: {line.strip()}"
            if "error" in l:
                return f"Error: {line.strip()}"
            if "failed" in l or "failure" in l:
                return f"Failed: {line.strip()}"
            if "returned exit code" in l or "exit code" in l:
                return f"Process Failed: {line.strip()}"

        # Fallback: first non-empty line
        for line in logs:
            if line.strip():
                return f"Log Entry: {line.strip()}"
        return "Unknown error occurred"

    # ---------------------------
    # High-level monitor flow
    # ---------------------------

    def monitor_pipeline(self, max_wait_time: int = 300) -> bool:
        """Monitor the CI/CD pipeline for the current branch."""
        print("🚀 Chat Backend Agent Pipeline Monitor")
        print("=" * 50)

        current_branch = self.get_current_branch()
        last_commit_full = self.get_last_commit_sha()
        last_commit_short = last_commit_full[:8] if last_commit_full else ""

        print(f"Branch: {current_branch}")
        print(f"Commit: {last_commit_short}")
        print(f"Max wait time: {max_wait_time} seconds\n")

        start_time = time.time()
        last_status = None

        while time.time() - start_time < max_wait_time:
            # Try to get workflow runs for the specific commit first
            workflow_runs = self.get_workflow_runs(current_branch, last_commit_full)

            # If no runs found for commit, fall back to recent runs for the branch
            if not workflow_runs:
                workflow_runs = self.get_workflow_runs(current_branch, "")
                if workflow_runs:
                    print(f"⚠️  No workflow run found for commit {last_commit_short}")
                    print(f"   Using most recent run for branch {current_branch}\n")

            if not workflow_runs:
                print("⚠️  No workflow runs found for current branch/commit")
                print("   This is normal if GitHub Actions are not set up yet")
                print("   or if the repository is private and no token is provided")
                return True  # Don't fail, just inform

            latest_run = workflow_runs[0]
            status = latest_run.get("status", "unknown")
            conclusion = latest_run.get("conclusion")

            # Only print status if it changed
            if status != last_status:
                if status == "completed":
                    if conclusion == "success":
                        print("✅ Pipeline succeeded!")
                        return True
                    elif conclusion == "failure":
                        print("❌ Pipeline failed!")
                        self._show_failure_details(latest_run)
                        return False
                    elif conclusion == "cancelled":
                        print("⚠️  Pipeline was cancelled")
                        return False
                elif status == "in_progress":
                    print("🔄 Pipeline is running...")
                    self._show_running_jobs(latest_run)
                elif status == "queued":
                    print("⏳ Pipeline is queued...")
                elif status == "waiting":
                    print("⏳ Pipeline is waiting...")

                last_status = status

            time.sleep(15)  # Check every 15 seconds

        print(f"\n⏰ Timeout after {max_wait_time} seconds")
        return False

    def _show_running_jobs(self, workflow_run: dict) -> None:
        """Show currently running jobs."""
        workflow_id = workflow_run.get("id")
        if not workflow_id:
            return

        jobs = self.get_workflow_jobs(workflow_id)
        running_jobs = [job for job in jobs if job.get("status") == "in_progress"]

        if running_jobs:
            print("  Running jobs:")
            for job in running_jobs:
                print(f"    🔄 {job.get('name', 'Unknown Job')}")

    def _show_failure_details(self, workflow_run: dict) -> None:
        """Show detailed information about pipeline failure."""
        workflow_id = workflow_run.get("id")
        if not workflow_id:
            return

        workflow_details = self.get_workflow_details(workflow_id)
        if not workflow_details:
            return

        print("\n" + "=" * 50)
        print("PIPELINE FAILURE DETAILS")
        print("=" * 50)
        
        # Basic workflow info
        workflow_name = workflow_details.get('name', 'Unknown')
        html_url = workflow_details.get('html_url', 'N/A')
        print(f"Workflow: {workflow_name}")
        print(f"URL: {html_url}")
        
        # Calculate duration
        created_at = workflow_details.get("created_at")
        updated_at = workflow_details.get("updated_at")
        if created_at and updated_at:
            try:
                created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                updated = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
                duration = updated - created
                print(f"Duration: {duration}")
            except ValueError:
                pass

        # Get jobs and analyze failures
        print(f"\nFetching job details...")
        jobs = self.get_workflow_jobs(workflow_id)
        
        if jobs:
            print(f"Found {len(jobs)} jobs")
            
            # Categorize jobs
            failed_jobs = [job for job in jobs if job.get("conclusion") == "failure"]
            successful_jobs = [job for job in jobs if job.get("conclusion") == "success"]
            skipped_jobs = [job for job in jobs if job.get("conclusion") == "skipped"]
            cancelled_jobs = [job for job in jobs if job.get("conclusion") == "cancelled"]
            
            # Show failed jobs with detailed error analysis
            if failed_jobs:
                print(f"\n❌ FAILED JOBS ({len(failed_jobs)}):")
                print("-" * 30)
                
                for job in failed_jobs:
                    job_name = job.get("name", "Unknown")
                    job_id = job.get("id")
                    
                    print(f"\n🔴 {job_name}")
                    
                    # Show timing info
                    started_at = job.get("started_at", "")
                    completed_at = job.get("completed_at", "")
                    if started_at and completed_at:
                        try:
                            started = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
                            completed = datetime.fromisoformat(completed_at.replace("Z", "+00:00"))
                            job_duration = completed - started
                            print(f"   Duration: {job_duration}")
                        except ValueError:
                            pass
                    
                    # Create direct link to job logs
                    if job_id:
                        job_logs_url = f"{html_url}/job/{job_id}"
                        print(f"   Logs: {job_logs_url}")
                    
                    # Try to get logs via API and show error summary
                    if job_id:
                        logs = self.get_job_logs_by_id(job_id, max_lines=100)
                        if logs:
                            # Extract and show error summary
                            error_summary = self.extract_error_summary(logs)
                            print(f"   Error: {error_summary}")
                            
                            # Show key error lines (last 10 relevant lines)
                            error_lines = []
                            for line in logs[-20:]:  # Check last 20 lines
                                line_lower = line.lower()
                                if any(keyword in line_lower for keyword in [
                                    "error:", "failed:", "exception:", "traceback:",
                                    "syntax error", "import error", "type error",
                                    "flake8", "mypy", "black", "isort"
                                ]):
                                    error_lines.append(line.strip())
                            
                            if error_lines:
                                print(f"   Key errors:")
                                for line in error_lines[-5:]:  # Show last 5 error lines
                                    if len(line) > 80:
                                        line = line[:77] + "..."
                                    print(f"     {line}")
                        else:
                            print(f"   ⚠️  Logs not available via API")
            
            # Show all jobs in order with their status
            print(f"\n📊 JOBS")
            print("-" * 30)
            
            for i, job in enumerate(jobs, 1):
                job_name = job.get("name", "Unknown")
                job_status = job.get("status", "unknown")
                job_conclusion = job.get("conclusion", "")
                
                # Determine status icon and text
                if job_status == "in_progress":
                    icon = "🔄"
                    status_text = "RUNNING"
                elif job_conclusion == "success":
                    icon = "✅"
                    status_text = "SUCCESS"
                elif job_conclusion == "failure":
                    icon = "❌"
                    status_text = "FAILED"
                elif job_conclusion == "cancelled":
                    icon = "⏹️"
                    status_text = "CANCELLED"
                elif job_conclusion == "skipped":
                    icon = "⏭️"
                    status_text = "SKIPPED"
                else:
                    icon = "❓"
                    status_text = "UNKNOWN"
                
                print(f"{i:2d}. {icon}  {job_name:<30} [{status_text}]")
            
            # Show summary
            total_jobs = len(jobs)
            print(f"\n📊 SUMMARY:")
            print(f"   Failed: {len(failed_jobs)}")
            print(f"   Successful: {len(successful_jobs)}")
            print(f"   Cancelled: {len(cancelled_jobs)}")
            print(f"   Skipped: {len(skipped_jobs)}")
            print(f"   Total: {total_jobs}")
            
                    
        else:
            print(f"⚠️  No jobs found")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Monitor Chat Backend Agent CI/CD pipelines")
    parser.add_argument(
        "--open", action="store_true", help="Open pipeline status in browser"
    )
    parser.add_argument(
        "--timeout", type=int, default=300, help="Maximum wait time in seconds"
    )

    args = parser.parse_args()

    monitor = PipelineMonitor()

    if args.open:
        print("🚀 Opening pipeline status in browser...")
        # TODO: Implement browser opening functionality
        print("⚠️  Browser opening not yet implemented")
    else:
        success = monitor.monitor_pipeline(args.timeout)
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
