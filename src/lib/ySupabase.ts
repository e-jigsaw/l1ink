// https://github.com/AlexDunmow/y-supabase/blob/cd7988be685d69359ea481862c245788f02fec8f/src/index.ts
import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RealtimeChannel } from "@supabase/realtime-js";
import { REALTIME_LISTEN_TYPES } from "@supabase/realtime-js/src/RealtimeChannel";
import { EventEmitter } from "eventemitter3";

export interface SupabaseProviderConfig {
  id: string | number;
  awareness?: awarenessProtocol.Awareness;
  resyncInterval?: number | false;
}

export default class SupabaseProvider extends EventEmitter {
  public awareness: awarenessProtocol.Awareness;
  public connected = false;

  private channel: RealtimeChannel | null = null;
  private channel_id: string | null = null;

  private _synced: boolean = false;
  private resyncInterval: NodeJS.Timer | undefined;
  protected logger: typeof console.log;
  public readonly id: number;

  public version: number = 0;

  isOnline(online?: boolean): boolean {
    if (!online && online !== false) return this.connected;
    this.connected = online;
    return this.connected;
  }

  onDocumentUpdate(update: Uint8Array, origin: any) {
    if (origin !== this) {
      this.logger(
        "document updated locally, broadcasting update to peers",
        this.isOnline()
      );
      this.emit("message", update);
      this.save();
    }
  }

  onAwarenessUpdate({ added, updated, removed }: any, origin: any) {
    const changedClients = added.concat(updated).concat(removed);
    const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(
      this.awareness,
      changedClients
    );
    this.emit("awareness", awarenessUpdate);
  }

  removeSelfFromAwarenessOnUnload() {
    awarenessProtocol.removeAwarenessStates(
      this.awareness,
      [this.doc.clientID],
      "window unload"
    );
  }

  async save() {
    const content = Array.from(Y.encodeStateAsUpdate(this.doc));

    const { error } = await this.supabase
      .from("pages")
      .update({ document: content, updated_at: new Date() })
      .eq("id", this.config.id);

    if (error) {
      throw error;
    }

    this.emit("save", this.version);
  }

  private async onConnect() {
    this.logger("connected");

    if (this.channel_id) {
      this.channel = this.supabase.channel(this.channel_id);
      if (this.channel) {
        this.channel
          .on(
            REALTIME_LISTEN_TYPES.BROADCAST,
            { event: "message" },
            ({ payload }) => {
              this.onMessage(Uint8Array.from(payload), this);
            }
          )
          .on(
            REALTIME_LISTEN_TYPES.BROADCAST,
            { event: "awareness" },
            ({ payload }) => {
              this.onAwareness(Uint8Array.from(payload));
            }
          )
          .subscribe((status, err) => {
            if (status === "CHANNEL_ERROR") {
              this.logger("CHANNEL_ERROR", err);
              this.emit("error", this);
            }

            if (status === "TIMED_OUT") {
              this.emit("disconnect", this);
            }

            if (status === "CLOSED") {
              this.emit("disconnect", this);
            }
          });
      }
    }

    this.logger("setting connected flag to true");
    this.isOnline(true);

    this.emit("status", [{ status: "connected" }]);

    if (this.awareness.getLocalState() !== null) {
      const awarenessUpdate = awarenessProtocol.encodeAwarenessUpdate(
        this.awareness,
        [this.doc.clientID]
      );
      this.emit("awareness", awarenessUpdate);
    }
  }

  private applyUpdate(update: Uint8Array, origin?: any) {
    this.version++;
    Y.applyUpdate(this.doc, update, origin);
  }

  private disconnect() {
    if (this.channel) {
      this.supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  private async connect() {
    const { data, error, status } = await this.supabase
      .from("pages")
      .select<string, { document: number[]; channel_id: string }>(
        "document, channel_id"
      )
      .eq("id", this.config.id)
      .single();

    this.logger("retrieved data from supabase", status);

    if (data && data.document) {
      this.channel_id = data.channel_id;
      this.logger("applying update to yjs");
      try {
        this.applyUpdate(Uint8Array.from(data.document));
        this.emit("connect");
      } catch (error) {
        this.logger(error);
      }
    }
  }

  constructor(
    private doc: Y.Doc,
    private supabase: SupabaseClient,
    private config: SupabaseProviderConfig
  ) {
    super();

    this.awareness =
      this.config.awareness || new awarenessProtocol.Awareness(doc);

    this.config = config || {};
    this.id = doc.clientID;

    this.supabase = supabase;
    this.on("connect", this.onConnect);
    this.on("disconnect", this.onDisconnect);

    this.logger = console.log;

    this.logger("constructor initializing");
    this.logger("connecting to Supabase Realtime", doc.guid);

    if (
      this.config.resyncInterval ||
      typeof this.config.resyncInterval === "undefined"
    ) {
      if (this.config.resyncInterval && this.config.resyncInterval < 3000) {
        throw new Error("resync interval of less than 3 seconds");
      }
      this.logger(
        `setting resync interval to every ${
          (this.config.resyncInterval || 5000) / 1000
        } seconds`
      );
      this.resyncInterval = setInterval(() => {
        this.logger("resyncing (resync interval elapsed)");
        this.emit("message", Y.encodeStateAsUpdate(this.doc));
        if (this.channel)
          this.channel.send({
            type: "broadcast",
            event: "message",
            payload: Array.from(Y.encodeStateAsUpdate(this.doc)),
          });
      }, this.config.resyncInterval || 5000);
    }

    if (typeof window !== "undefined") {
      window.addEventListener(
        "beforeunload",
        this.removeSelfFromAwarenessOnUnload
      );
    } else if (typeof process !== "undefined") {
      process.on("exit", () => this.removeSelfFromAwarenessOnUnload);
    }
    this.on("awareness", (update) => {
      if (this.channel)
        this.channel.send({
          type: "broadcast",
          event: "awareness",
          payload: Array.from(update),
        });
    });
    this.on("message", (update) => {
      if (this.channel)
        this.channel.send({
          type: "broadcast",
          event: "message",
          payload: Array.from(update),
        });
    });

    this.connect();
    this.doc.on("update", this.onDocumentUpdate.bind(this));
    this.awareness.on("update", this.onAwarenessUpdate.bind(this));
  }

  get synced() {
    return this._synced;
  }

  set synced(state) {
    if (this._synced !== state) {
      this.logger("setting sync state to " + state);
      this._synced = state;
      this.emit("synced", [state]);
      this.emit("sync", [state]);
    }
  }

  public onConnecting() {
    if (!this.isOnline()) {
      this.logger("connecting");
      this.emit("status", [{ status: "connecting" }]);
    }
  }

  public onDisconnect() {
    this.logger("disconnected");

    this.synced = false;
    this.isOnline(false);
    this.logger("set connected flag to false");
    if (this.isOnline()) {
      this.emit("status", [{ status: "disconnected" }]);
    }

    // update awareness (keep all users except local)
    // FIXME? compare to broadcast channel behavior
    const states = Array.from(this.awareness.getStates().keys()).filter(
      (client) => client !== this.doc.clientID
    );
    awarenessProtocol.removeAwarenessStates(this.awareness, states, this);
  }

  public onMessage(message: Uint8Array, origin: any) {
    if (!this.isOnline()) return;
    if (message.length === 0) return;
    try {
      this.applyUpdate(message, this);
    } catch (err) {
      this.logger(err);
    }
  }

  public onAwareness(message: Uint8Array) {
    if (message.length === 0) return;
    awarenessProtocol.applyAwarenessUpdate(this.awareness, message, this);
  }

  public onAuth(message: Uint8Array) {
    this.logger(`received ${message.byteLength} bytes from peer: ${message}`);

    if (!message) {
      this.logger(`Permission denied to channel`);
    }
    this.logger("processed message (type = MessageAuth)");
  }

  public destroy() {
    this.logger("destroying");

    if (this.resyncInterval) {
      clearInterval(this.resyncInterval);
    }

    if (typeof window !== "undefined") {
      window.removeEventListener(
        "beforeunload",
        this.removeSelfFromAwarenessOnUnload
      );
    } else if (typeof process !== "undefined") {
      process.off("exit", () => this.removeSelfFromAwarenessOnUnload);
    }

    this.awareness.off("update", this.onAwarenessUpdate);
    this.doc.off("update", this.onDocumentUpdate);

    if (this.channel) this.disconnect();
  }
}
