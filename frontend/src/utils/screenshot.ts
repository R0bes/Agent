import html2canvas from "html2canvas";

export async function takeScreenshot(
  selector?: string,
  fullPage: boolean = false
): Promise<string> {
  try {
    let element: HTMLElement | null = null;

    if (selector) {
      element = document.querySelector(selector) as HTMLElement;
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }
    } else {
      element = document.body;
    }

    const options: html2canvas.Options = {
      useCORS: true,
      allowTaint: true,
      scale: 1,
      logging: false,
      ...(fullPage ? {} : { height: window.innerHeight, width: window.innerWidth })
    };

    const canvas = await html2canvas(element, options);
    const base64 = canvas.toDataURL("image/png");
    
    return base64;
  } catch (error: any) {
    throw new Error(`Screenshot failed: ${error.message}`);
  }
}

