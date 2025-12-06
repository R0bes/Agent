export interface ElementInfo {
  selector: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  visible: boolean;
  textContent: string;
  tagName: string;
  className: string;
  id: string;
}

export function getElementInfo(selectorOrId: string): ElementInfo {
  const selector = selectorOrId.startsWith("#") 
    ? selectorOrId 
    : selectorOrId.startsWith(".") 
    ? selectorOrId 
    : `#${selectorOrId}`;
  
  const element = document.querySelector(selector) as HTMLElement;
  
  if (!element) {
    throw new Error(`Element not found: ${selector}`);
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);
  
  return {
    selector,
    position: {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height
    },
    visible: style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0,
    textContent: element.textContent?.trim() || "",
    tagName: element.tagName,
    className: element.className,
    id: element.id || ""
  };
}

