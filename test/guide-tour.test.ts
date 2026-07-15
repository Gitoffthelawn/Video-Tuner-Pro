// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GuideTour } from "../src/popup/components/GuideTour.js";

vi.mock("../src/popup/i18n.js", () => ({ msg: () => "" }));

const selectors = [
  "speed-section",
  "live-sync-section",
  "viewer-auto-section",
  "autoslow-section",
  "audio-section",
];

let root: Root;

function rect(top: number, left: number, width: number, height: number): DOMRect {
  return { top, left, width, height, right: left + width, bottom: top + height } as DOMRect;
}

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  selectors.forEach((name, index) => {
    const slot = document.createElement("div");
    slot.className = "card-slot";
    slot.getBoundingClientRect = () => rect(20 + index * 100, 30, 280, 80);
    const section = document.createElement("section");
    section.className = name;
    const header = document.createElement("div");
    header.className = "sec-head";
    header.getBoundingClientRect = () => rect(24 + index * 100, 34, 272, 32);
    section.appendChild(header);
    slot.appendChild(section);
    document.body.appendChild(slot);
  });
  root = createRoot(document.getElementById("root")!);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = "";
});

function click(selector: string): void {
  act(() => document.querySelector<HTMLButtonElement>(selector)!.click());
}

describe("first-open guide tour", () => {
  it("walks through overview, learn-by-doing expansion, settings, and every card", () => {
    const onClose = vi.fn();
    const onExpand = vi.fn();
    act(() => root.render(createElement(GuideTour, { onClose, onExpand })));

    expect(document.querySelector(".tour-spot")).not.toBeNull();
    expect(document.querySelector(".tour-cap-title")?.textContent).toBe("Playback speed");
    expect(onExpand).toHaveBeenLastCalledWith(null);

    click(".tour-next");
    expect(document.querySelector<HTMLButtonElement>(".tour-next")?.disabled).toBe(true);
    expect(document.querySelector(".tour-hotspot")).not.toBeNull();

    click(".tour-hotspot");
    expect(onExpand).toHaveBeenLastCalledWith(0);
    expect(document.querySelector(".tour-spot")).toBeNull();
    expect(document.querySelector(".tour-cap")?.classList.contains("is-bottom")).toBe(true);

    click(".tour-next");
    expect(document.querySelector(".tour-cap-title")?.textContent).toBe("Keep stream live");
    expect(onExpand).toHaveBeenLastCalledWith(null);

    click(".tour-next");
    click(".tour-next");
    click(".tour-next");
    expect(document.querySelector(".tour-cap-title")?.textContent).toBe("Audio compression");
    expect(document.querySelector(".tour-next")?.textContent).toBe("Done");

    click(".tour-next");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("supports Back and Skip without leaving a card forced open", () => {
    const onClose = vi.fn();
    const onExpand = vi.fn();
    act(() => root.render(createElement(GuideTour, { onClose, onExpand })));

    click(".tour-next");
    click(".tour-back");
    expect(document.querySelector(".tour-cap-title")?.textContent).toBe("Playback speed");
    expect(document.querySelector(".tour-back")).toBeNull();

    click(".tour-skip");
    expect(onClose).toHaveBeenCalledOnce();
    expect(onExpand).toHaveBeenLastCalledWith(null);
  });

  it("keeps the caption hidden when a target card is missing", () => {
    document.querySelector(".speed-section")?.closest(".card-slot")?.remove();
    act(() => root.render(createElement(GuideTour, { onClose: vi.fn(), onExpand: vi.fn() })));

    expect(document.querySelector(".tour-spot")).toBeNull();
    expect((document.querySelector(".tour-cap") as HTMLElement).style.visibility).toBe("hidden");
  });
});
