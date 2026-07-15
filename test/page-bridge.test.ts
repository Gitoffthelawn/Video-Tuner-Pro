// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SHADOW_ROOT_ATTACHED_EVENT } from "../src/shared/dom-events.js";

vi.mock("../src/content/quality-loader.js", () => ({}));
vi.mock("../src/content/audio-inject.js", () => ({}));

const nativeDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "attachShadow")!;
const bridgeWindow = window as typeof window & { __vtpShadowAttachBridge?: boolean };

async function installBridge(): Promise<void> {
  vi.resetModules();
  await import("../src/content/page-bridge.js");
}

beforeEach(() => {
  Object.defineProperty(Element.prototype, "attachShadow", nativeDescriptor);
  delete bridgeWindow.__vtpShadowAttachBridge;
  document.body.innerHTML = "";
});

afterEach(() => {
  Object.defineProperty(Element.prototype, "attachShadow", nativeDescriptor);
  delete bridgeWindow.__vtpShadowAttachBridge;
  vi.restoreAllMocks();
});

describe("MAIN-world shadow-root bridge", () => {
  it("announces an open root synchronously on its host", async () => {
    await installBridge();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const events: Event[] = [];
    host.addEventListener(SHADOW_ROOT_ATTACHED_EVENT, (event) => events.push(event));

    const root = host.attachShadow({ mode: "open" });

    expect(root).toBe(host.shadowRoot);
    expect(events).toHaveLength(1);
    expect(events[0].bubbles).toBe(true);
    expect(events[0].composed).toBe(true);
  });

  it("does not expose or announce a closed root", async () => {
    await installBridge();
    const host = document.createElement("div");
    document.body.appendChild(host);
    const onAttached = vi.fn();
    host.addEventListener(SHADOW_ROOT_ATTACHED_EVENT, onAttached);

    const root = host.attachShadow({ mode: "closed" });

    expect(root.mode).toBe("closed");
    expect(host.shadowRoot).toBeNull();
    expect(onAttached).not.toHaveBeenCalled();
  });

  it("installs only one proxy even if the bundle executes twice", async () => {
    await installBridge();
    const first = Element.prototype.attachShadow;
    await installBridge();

    expect(Element.prototype.attachShadow).toBe(first);
    expect(bridgeWindow.__vtpShadowAttachBridge).toBe(true);
  });

  it("keeps native attachShadow working if bridge event dispatch fails", async () => {
    await installBridge();
    const host = document.createElement("div");
    const dispatch = vi.spyOn(host, "dispatchEvent").mockImplementation(() => {
      throw new Error("page blocked synthetic events");
    });

    expect(() => host.attachShadow({ mode: "open" })).not.toThrow();
    expect(host.shadowRoot).not.toBeNull();
    expect(dispatch).toHaveBeenCalled();
  });
});
