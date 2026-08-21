"use client";

import { useEffect } from "react";

export default function RoomBuilderScrollUnlock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const previous = {
      htmlHeight: html.style.getPropertyValue("height"),
      htmlOverflow: html.style.getPropertyValue("overflow"),
      bodyPosition: body.style.getPropertyValue("position"),
      bodyInset: body.style.getPropertyValue("inset"),
      bodyWidth: body.style.getPropertyValue("width"),
      bodyHeight: body.style.getPropertyValue("height"),
      bodyOverflow: body.style.getPropertyValue("overflow"),
    };

    html.style.setProperty("height", "auto", "important");
    html.style.setProperty("overflow-x", "hidden", "important");
    html.style.setProperty("overflow-y", "auto", "important");

    body.style.setProperty("position", "static", "important");
    body.style.setProperty("inset", "auto", "important");
    body.style.setProperty("width", "100%", "important");
    body.style.setProperty("height", "auto", "important");
    body.style.setProperty("min-height", "100%", "important");
    body.style.setProperty("overflow-x", "hidden", "important");
    body.style.setProperty("overflow-y", "auto", "important");

    return () => {
      const restore = (element: HTMLElement, property: string, value: string) => {
        if (value) element.style.setProperty(property, value);
        else element.style.removeProperty(property);
      };

      restore(html, "height", previous.htmlHeight);
      restore(html, "overflow", previous.htmlOverflow);
      restore(body, "position", previous.bodyPosition);
      restore(body, "inset", previous.bodyInset);
      restore(body, "width", previous.bodyWidth);
      restore(body, "height", previous.bodyHeight);
      restore(body, "overflow", previous.bodyOverflow);
    };
  }, []);

  return null;
}
