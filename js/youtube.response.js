// Build: 2026 Optimized High-Performance for Shadowrocket
// Architecture: Dang Hieu
(() => {
  const g = globalThis;
  const TD = new TextDecoder("utf-8");
  const TE = new TextEncoder();

  // --- CORE PROTOBUF RUNTIME (SLIM & NATIVE) ---
  const Wire = { Varint: 0, Bit64: 1, LengthDelimited: 2, Bit32: 5 };
  const SymUnknown = Symbol.for("protobuf-ts/unknown");

  const UnknownFieldHandler = {
    list: (msg, no) => {
      const list = msg && msg[SymUnknown];
      if (!Array.isArray(list)) return [];
      return no ? list.filter(f => f.no === no) : list;
    },
    onRead: (typeName, msg, no, wireType, data) => {
      (msg[SymUnknown] || (msg[SymUnknown] = [])).push({ no, wireType, data });
    },
    onWrite: (typeName, msg, writer) => {
      for (const { no, wireType, data } of UnknownFieldHandler.list(msg)) {
        writer.tag(no, wireType).raw(data);
      }
    }
  };

  class FastReader {
    constructor(buf) {
      this.buf = buf;
      this.len = buf.length;
      this.pos = 0;
      this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    uint32() {
      let b = this.buf[this.pos++], r = b & 127;
      if (!(b & 128)) return r >>> 0;
      b = this.buf[this.pos++]; r |= (b & 127) << 7;
      if (!(b & 128)) return r >>> 0;
      b = this.buf[this.pos++]; r |= (b & 127) << 14;
      if (!(b & 128)) return r >>> 0;
      b = this.buf[this.pos++]; r |= (b & 127) << 21;
      if (!(b & 128)) return r >>> 0;
      b = this.buf[this.pos++]; r |= (b & 15) << 28;
      while (this.buf[this.pos++] & 128);
      return r >>> 0;
    }
    int32() { return this.uint32() | 0; }
    bool() { return this.uint32() !== 0; }
    string() { return TD.decode(this.bytes()); }
    bytes() {
      const len = this.uint32();
      const start = this.pos;
      this.pos += len;
      return this.buf.subarray(start, this.pos);
    }
    tag() {
      const val = this.uint32();
      return [val >>> 3, val & 7];
    }
    skip(wireType) {
      const start = this.pos;
      switch (wireType) {
        case Wire.Varint: while (this.buf[this.pos++] & 128); break;
        case Wire.Bit64: this.pos += 8; break;
        case Wire.LengthDelimited: this.pos += this.uint32(); break;
        case Wire.Bit32: this.pos += 4; break;
        default: throw new Error(`Unsupported wire: ${wireType}`);
      }
      return this.buf.subarray(start, this.pos);
    }
  }

  class FastWriter {
    constructor() {
      this.chunks = [];
      this.buf = [];
    }
    tag(no, wireType) {
      return this.uint32((no << 3) | wireType);
    }
    uint32(val) {
      val = val >>> 0;
      while (val > 127) {
        this.buf.push((val & 127) | 128);
        val >>>= 7;
      }
      this.buf.push(val);
      return this;
    }
    int32(val) {
      if (val >= 0) return this.uint32(val);
      for (let i = 0; i < 9; i++) {
        this.buf.push((val & 127) | 128);
        val >>= 7;
      }
      this.buf.push(1);
      return this;
    }
    bool(val) { this.buf.push(val ? 1 : 0); return this; }
    bytes(val) { this.uint32(val.byteLength); return this.raw(val); }
    string(val) { const b = TE.encode(val); this.uint32(b.byteLength); return this.raw(b); }
    raw(bytes) {
      if (this.buf.length) {
        this.chunks.push(new Uint8Array(this.buf));
        this.buf = [];
      }
      this.chunks.push(bytes);
      return this;
    }
    fork() {
      const child = new FastWriter();
      child.parent = this;
      return child;
    }
    join() {
      const data = this.finish();
      this.parent.uint32(data.byteLength);
      this.parent.raw(data);
      return this.parent;
    }
    finish() {
      if (this.buf.length) this.chunks.push(new Uint8Array(this.buf));
      let total = 0;
      for (let i = 0; i < this.chunks.length; i++) total += this.chunks[i].length;
      const res = new Uint8Array(total);
      let offset = 0;
      for (let i = 0; i < this.chunks.length; i++) {
        res.set(this.chunks[i], offset);
        offset += this.chunks[i].length;
      }
      return res;
    }
  }

  // --- MESSAGE DEFINITIONS ---
  class BaseMessage {
    fromBinary(buf) {
      const reader = new FastReader(buf);
      const msg = this.create();
      this.read(reader, msg, buf.length);
      return msg;
    }
    toBinary(msg) {
      const writer = new FastWriter();
      this.write(writer, msg);
      return writer.finish();
    }
  }

  // Run & Label
  const RunType = new class extends BaseMessage {
    create() { return { text: "" }; }
    read(r, m, len) {
      const end = r.pos + len;
      while (r.pos < end) {
        const [no, wire] = r.tag();
        if (no === 1) m.text = r.string();
        else r.skip(wire);
      }
      return m;
    }
    write(w, m) {
      if (m.text) w.tag(1, Wire.LengthDelimited).string(m.text);
    }
  };

  const LabelType = new class extends BaseMessage {
    create() { return { runs: [] }; }
    read(r, m, len) {
      const end = r.pos + len;
      while (r.pos < end) {
        const [no, wire] = r.tag();
        if (no === 1) m.runs.push(RunType.read(r, RunType.create(), r.uint32()));
        else r.skip(wire);
      }
      return m;
    }
    write(w, m) {
      if (m.runs) {
        for (const item of m.runs) {
          RunType.write(w.tag(1, Wire.LengthDelimited).fork(), item).join();
        }
      }
    }
  };

  // Browse Messages
  const LayoutRenderType = new class extends BaseMessage {
    create() { return { eml: "" }; }
    read(r, m, len) {
      const end = r.pos + len;
      while (r.pos < end) {
        const [no, wire] = r.tag();
        if (no === 1) m.eml = r.string();
        else r.skip(wire);
      }
      return m;
    }
    write(w, m) {
      if (m.eml) w.tag(1, Wire.LengthDelimited).string(m.eml);
    }
  };

  const RenderInfoType = new class extends BaseMessage {
    create() { return {}; }
    read(r, m, len) {
      const end = r.pos + len;
      while (r.pos < end) {
        const [no, wire] = r.tag();
        if (no === 183314536) m.layoutRender = LayoutRenderType.read(r, LayoutRenderType.create(), r.uint32());
        else r.skip(wire);
      }
      return m;
    }
    write(w, m) {
      if (m.layoutRender) LayoutRenderType.write(w.tag(183314536, Wire.LengthDelimited).fork(), m.layoutRender).join();
    }
  };

  const VideoContextType = new class extends BaseMessage {
    create() { return {}; }
    read(r, m, len) {
      const end = r.pos + len;
      while (r.pos < end) {
        const [no, wire] = r.tag();
        if (no === 5) {
          m.videoContent = {};
          const cEnd = r.pos + r.uint32();
          while (r.pos < cEnd) {
            const [cNo, cWire] = r.tag();
            UnknownFieldHandler.onRead("videoContent", m.videoContent, cNo, cWire, r.skip(cWire));
          }
        } else r.skip(wire);
      }
      return m;
    }
    write(w, m) {
      if (m.videoContent) {
        const cw = w.tag(5, Wire.LengthDelimited).fork();
        UnknownFieldHandler.onWrite("videoContent", m.videoContent, cw);
        cw.join();
      }
    }
  };

  const VideoInfoType = new class extends BaseMessage {
    create() { return {}; }
    read(r, m, len) {
      const end = r.pos + len;
      while (r.pos < end) {
        const [no, wire] = r.tag();
        if (no === 168777401) m.videoContext = VideoContextType.read(r, VideoContextType.create(), r.uint32());
        else r.skip(wire);
      }
      return m;
    }
    write(w, m) {
      if (m.videoContext) VideoContextType.write(w.tag(168777401, Wire.LengthDelimited).fork(), m.videoContext).join();
    }
  };

  const VideoRendererContentType = new class extends BaseMessage {
    create() { return {}; }
    read(r, m, len) {
      const end = r.pos + len;
      while (r.pos < end) {
        const [no, wire] = r.tag();
        if (no === 1) m.videoInfo = VideoInfoType.read(r, VideoInfoType.create(), r.uint32());
        else if (no === 2) m.renderInfo = RenderInfoType.read(r, RenderInfoType.create(), r.uint32());
        else r.skip(wire);
      }
      return m;
    }
    write(w, m) {
      if (m.videoInfo) VideoInfoType.write(w.tag(1, Wire.LengthDelimited).fork(), m.videoInfo).join();
      if (m.renderInfo) RenderInfoType.write(w.tag(2, Wire.LengthDelimited).fork(), m.renderInfo).join();
    }
  };

  const ElementRendererType = new class extends BaseMessage {
    create() { return {}; }
    read(r, m, len) {
      const end = r.pos + len;
      while (r.pos < end) {
        const [no, wire] = r.tag();
        if (no === 172660663) m.videoRendererContent = VideoRendererContentType.read(r, VideoRendererContentType.create(), r.uint32());
        else r.skip(wire);
      }
      return m;
    }
    write(w, m) {
      if (m.videoRendererContent) VideoRendererContentType.write(w.tag(172660663, Wire.LengthDelimited).fork(), m.videoRendererContent).join();
    }
  };

  const RichItemContentType = new class extends BaseMessage {
    create() { return {}; }
    read(r, m, len) {
      const end = r.pos + len;
      while (r.pos < end) {
        const [no, wire] = r.tag();
        if (no === 153515154) m.videoWithContextRenderer = ElementRendererType.read(r, ElementRendererType.create(), r.uint32());
        else UnknownFieldHandler.onRead("RichItemContent", m, no, wire, r.skip(wire));
      }
      return m;
    }
    write(w, m) {
      if (m.videoWithContextRenderer) ElementRendererType.write(w.tag(153515154, Wire.LengthDelimited).fork(), m.videoWithContextRenderer).join();
      UnknownFieldHandler.onWrite("RichItemContent", m, w);
    }
  };

  const ItemSectionRendererType = new class extends BaseMessage {
    create() { return { richItemContents: [] }; }
    read(r, m, len) {
      const end = r.pos + len;
      while (r.pos < end) {
        const [no, wire] = r.tag();
        if (no === 1) m.richItemContents.push(RichItemContentType.read(r, RichItemContentType.create(), r.uint32()));
        else r.skip(wire);
      }
      return m;
    }
    write(w, m) {
      if (m.richItemContents) {
        for (const item of m.richItemContents) {
          RichItemContentType.write(w.tag(1, Wire.LengthDelimited).fork(), item).join();
        }
      }
    }
  };

  const ShelfRendererType = new class extends BaseMessage {
    create() { return {}; }
    read(r, m, len) {
      const end = r.pos + len;
      while (r.pos < end) {
        const [no, wire] = r.tag();
        if (no === 5) {
          const sEnd = r.pos + r.uint32();
          m.richSectionContent = {};
          while (r.pos < sEnd) {
            const [sNo, sWire] = r.tag();
            if (sNo === 51431404) {
              const rEnd = r.pos + r.uint32();
              m.richSectionContent.reelShelfRenderer = { richItemContents: [] };
              while (r.pos < rEnd) {
                const [rNo, rWire] = r.tag();
                if (rNo === 1) m.richSectionContent.reelShelfRenderer.richItemContents.push(RichItemContentType.read(r, RichItemContentType.create(), r.uint32()));
                else r.skip(rWire);
              }
            } else r.skip(sWire);
          }
        } else r.skip(wire);
      }
      return m;
    }
    write(w, m) {
      if (m.richSectionContent?.reelShelfRenderer) {
        const sw = w.tag(5, Wire.LengthDelimited).fork();
        const rw = sw.tag(51431404, Wire.LengthDelimited).fork();
        for (const item of m.richSectionContent.reelShelfRenderer.richItemContents) {
          RichItemContentType.write(rw.tag(1, Wire.LengthDelimited).fork(), item).join();
        }
        rw.join();
        sw.join();
      }
    }
  };

  const SectionListSupportedRendererType = new class extends BaseMessage {
    create() { return {}; }
    read(r, m, len) {
      const end = r.pos + len;
      while (r.pos < end) {
        const [no, wire] = r.tag();
        if (no === 50195462) m.itemSectionRenderer = ItemSectionRendererType.read(r, ItemSectionRendererType.create(), r.uint32());
        else if (no === 51845067) m.shelfRenderer = ShelfRendererType.read(r, ShelfRendererType.create(), r.uint32());
        else r.skip(wire);
      }
      return m;
    }
    write(w, m) {
      if (m.itemSectionRenderer) ItemSectionRendererType.write(w.tag(50195462, Wire.LengthDelimited).fork(), m.itemSectionRenderer).join();
      if (m.shelfRenderer) ShelfRendererType.write(w.tag(51845067, Wire.LengthDelimited).fork(), m.shelfRenderer).join();
    }
  };

  const SectionListRendererType = new class extends BaseMessage {
    create() { return { sectionListSupportedRenderers: [] }; }
    read(r, m, len) {
      const end = r.pos + len;
      while (r.pos < end) {
        const [no, wire] = r.tag();
        if (no === 1) m.sectionListSupportedRenderers.push(SectionListSupportedRendererType.read(r, SectionListSupportedRendererType.create(), r.uint32()));
        else r.skip(wire);
      }
      return m;
    }
    write(w, m) {
      if (m.sectionListSupportedRenderers) {
        for (const item of m.sectionListSupportedRenderers) {
          SectionListSupportedRendererType.write(w.tag(1, Wire.LengthDelimited).fork(), item).join();
        }
      }
    }
  };

  const ContentType = new class extends BaseMessage {
    create() { return {}; }
    read(r, m, len) {
      const end = r.pos + len;
      while (r.pos < end) {
        const [no, wire] = r.tag();
        if (no === 58173949) {
          m.singleColumnResultsRenderer = { tabs: [] };
          const sEnd = r.pos + r.uint32();
          while (r.pos < sEnd) {
            const [sNo, sWire] = r.tag();
            if (sNo === 1) {
              const tEnd = r.pos + r.uint32();
              const tab = {};
              while (r.pos < tEnd) {
                const [tNo, tWire] = r.tag();
                if (tNo === 58174010) {
                  const rEnd = r.pos + r.uint32();
                  tab.tabRenderer = {};
                  while (r.pos < rEnd) {
                    const [rNo, rWire] = r.tag();
                    if (rNo === 4) tab.tabRenderer.content = ContentType.read(r, ContentType.create(), r.uint32());
                    else r.skip(rWire);
                  }
                } else r.skip(tWire);
              }
              m.singleColumnResultsRenderer.tabs.push(tab);
            } else r.skip(sWire);
          }
        } else if (no === 153515154) m.elementRenderer = ElementRendererType.read(r, ElementRendererType.create(), r.uint32());
        else if (no === 49399797) m.sectionListRenderer = SectionListRendererType.read(r, SectionListRendererType.create(), r.uint32());
        else r.skip(wire);
      }
      return m;
    }
    write(w, m) {
      if (m.singleColumnResultsRenderer?.tabs) {
        const scw = w.tag(58173949, Wire.LengthDelimited).fork();
        for (const tab of m.singleColumnResultsRenderer.tabs) {
          if (tab.tabRenderer?.content) {
            const tw = scw.tag(1, Wire.LengthDelimited).fork();
            const rw = tw.tag(58174010, Wire.LengthDelimited).fork();
            ContentType.write(rw.tag(4, Wire.LengthDelimited).fork(), tab.tabRenderer.content).join();
            rw.join();
            tw.join();
          }
        }
        scw.join();
      }
      if (m.elementRenderer) ElementRendererType.write(w.tag(153515154, Wire.LengthDelimited).fork(), m.elementRenderer).join();
      if (m.sectionListRenderer) SectionListRendererType.write(w.tag(49399797, Wire.LengthDelimited).fork(), m.sectionListRenderer).join();
    }
  };

  const BrowseType = new class extends BaseMessage {
    create() { return {}; }
    read(r, m, len) {
      const end = r.pos + len;
      while (r.pos < end) {
        const [no, wire] = r.tag();
        if (no === 9) m.content = ContentType.read(r, ContentType.create(), r.uint32());
        else if (no === 10) m.onResponseReceivedAction = ContentType.read(r, ContentType.create(), r.uint32());
        else r.skip(wire);
      }
      return m;
    }
    write(w, m) {
      if (m.content) ContentType.write(w.tag(9, Wire.LengthDelimited).fork(), m.content).join();
      if (m.onResponseReceivedAction) ContentType.write(w.tag(10, Wire.LengthDelimited).fork(), m.onResponseReceivedAction).join();
    }
  };

  // Player Messages
  const PlayerType = new class extends BaseMessage {
    create() { return { adPlacements: [], adSlots: [] }; }
    read(r, m, len) {
      const end = r.pos + len;
      while (r.pos < end) {
        const [no, wire] = r.tag();
        if (no === 7) { m.adPlacements.push({}); r.skip(wire); }
        else if (no === 68) { m.adSlots.push({}); r.skip(wire); }
        else if (no === 2) {
          const pEnd = r.pos + r.uint32();
          m.playabilityStatus = {};
          while (r.pos < pEnd) {
            const [pNo, pWire] = r.tag();
            if (pNo === 21) {
              const mEnd = r.pos + r.uint32();
              m.playabilityStatus.miniPlayer = {};
              while (r.pos < mEnd) {
                const [mNo, mWire] = r.tag();
                if (mNo === 151635310) {
                  const mrEnd = r.pos + r.uint32();
                  m.playabilityStatus.miniPlayer.miniPlayerRender = {};
                  while (r.pos < mrEnd) {
                    const [mrNo, mrWire] = r.tag();
                    if (mrNo === 1) m.playabilityStatus.miniPlayer.miniPlayerRender.active = r.bool();
                    else r.skip(mrWire);
                  }
                } else r.skip(mWire);
              }
            } else r.skip(pWire);
          }
        } else if (no === 9) {
          const pbEnd = r.pos + r.uint32();
          m.playbackTracking = {};
          while (r.pos < pbEnd) {
            const [pbNo, pbWire] = r.tag();
            if (pbNo === 18) r.skip(pbWire); // Bỏ pageadViewthroughconversion
            else UnknownFieldHandler.onRead("playbackTracking", m.playbackTracking, pbNo, pbWire, r.skip(pbWire));
          }
        } else UnknownFieldHandler.onRead("Player", m, no, wire, r.skip(wire));
      }
      return m;
    }
    write(w, m) {
      if (m.playabilityStatus) {
        const pw = w.tag(2, Wire.LengthDelimited).fork();
        // Force Active Background Player
        const bgw = pw.tag(11, Wire.LengthDelimited).fork();
        const bgrw = bgw.tag(64657230, Wire.LengthDelimited).fork();
        bgrw.tag(1, Wire.Varint).bool(true);
        bgrw.join();
        bgw.join();

        if (m.playabilityStatus.miniPlayer?.miniPlayerRender) {
          const mpw = pw.tag(21, Wire.LengthDelimited).fork();
          const mprw = mpw.tag(151635310, Wire.LengthDelimited).fork();
          mprw.tag(1, Wire.Varint).bool(true);
          mprw.join();
          mpw.join();
        }
        pw.join();
      }
      if (m.playbackTracking) {
        const pbw = w.tag(9, Wire.LengthDelimited).fork();
        UnknownFieldHandler.onWrite("playbackTracking", m.playbackTracking, pbw);
        pbw.join();
      }
      UnknownFieldHandler.onWrite("Player", m, w);
    }
  };

  // Guide Messages
  const GuideType = new class extends BaseMessage {
    create() { return { labelItems: [], iconItems: [] }; }
    read(r, m, len) {
      const end = r.pos + len;
      const parseItem = () => {
        const iEnd = r.pos + r.uint32();
        const item = {};
        while (r.pos < iEnd) {
          const [iNo, iWire] = r.tag();
          if (iNo === 117866661) {
            const sEnd = r.pos + r.uint32();
            item.guideSectionRenderer = { rendererItems: [] };
            while (r.pos < sEnd) {
              const [sNo, sWire] = r.tag();
              if (sNo === 1) {
                const rEnd = r.pos + r.uint32();
                const rItem = {};
                while (r.pos < rEnd) {
                  const [rNo, rWire] = r.tag();
                  if (rNo === 318370163 || rNo === 117501096) {
                    const eEnd = r.pos + r.uint32();
                    const eObj = {};
                    while (r.pos < eEnd) {
                      const [eNo, eWire] = r.tag();
                      if (eNo === 1) eObj.browseId = r.string();
                      else r.skip(eWire);
                    }
                    if (rNo === 318370163) rItem.iconRender = eObj;
                    else rItem.labelRender = eObj;
                  } else r.skip(rWire);
                }
                item.guideSectionRenderer.rendererItems.push(rItem);
              } else r.skip(sWire);
            }
          } else r.skip(iWire);
        }
        return item;
      };
      while (r.pos < end) {
        const [no, wire] = r.tag();
        if (no === 4) m.labelItems.push(parseItem());
        else if (no === 6) m.iconItems.push(parseItem());
        else r.skip(wire);
      }
      return m;
    }
    write(w, m) {
      const writeItem = (parent, item, tagNo) => {
        if (!item.guideSectionRenderer?.rendererItems) return;
        const iw = parent.tag(tagNo, Wire.LengthDelimited).fork();
        const sw = iw.tag(117866661, Wire.LengthDelimited).fork();
        for (const ri of item.guideSectionRenderer.rendererItems) {
          const rw = sw.tag(1, Wire.LengthDelimited).fork();
          if (ri.iconRender) {
            const ew = rw.tag(318370163, Wire.LengthDelimited).fork();
            if (ri.iconRender.browseId) ew.tag(1, Wire.LengthDelimited).string(ri.iconRender.browseId);
            ew.join();
          }
          if (ri.labelRender) {
            const ew = rw.tag(117501096, Wire.LengthDelimited).fork();
            if (ri.labelRender.browseId) ew.tag(1, Wire.LengthDelimited).string(ri.labelRender.browseId);
            ew.join();
          }
          rw.join();
        }
        sw.join();
        iw.join();
      };
      for (const it of m.labelItems) writeItem(w, it, 4);
      for (const it of m.iconItems) writeItem(w, it, 6);
    }
  };

  // Setting Messages
  const SettingType = new class extends BaseMessage {
    create() { return { settingItems: [] }; }
    read(r, m, len) {
      const end = r.pos + len;
      while (r.pos < end) {
        const [no, wire] = r.tag();
        if (no === 6 || no === 7) {
          const iEnd = r.pos + r.uint32();
          const item = {};
          while (r.pos < iEnd) {
            const [iNo, iWire] = r.tag();
            if (iNo === 66930374) {
              const cEnd = r.pos + r.uint32();
              item.settingCategoryCollectionRenderer = { subSettings: [] };
              while (r.pos < cEnd) {
                const [cNo, cWire] = r.tag();
                if (cNo === 4) item.settingCategoryCollectionRenderer.categoryId = r.int32();
                else r.skip(cWire);
              }
            } else r.skip(iWire);
          }
          m.settingItems.push(item);
        } else r.skip(wire);
      }
      return m;
    }
    write(w, m) {
      // Background Playback Setting Inject
      const bw = w.tag(6, Wire.LengthDelimited).fork();
      const brw = bw.tag(88478200, Wire.LengthDelimited).fork();
      brw.tag(2, Wire.Varint).bool(true); // backgroundPlayback
      brw.tag(3, Wire.Varint).bool(true); // download
      brw.tag(9, Wire.Varint).bool(true); // downloadQualitySelection
      brw.tag(10, Wire.Varint).bool(true); // smartDownload
      const icon = brw.tag(14, Wire.LengthDelimited).fork();
      icon.tag(1, Wire.Varint).int32(1093);
      icon.join();
      brw.join();
      bw.join();

      for (const item of m.settingItems) {
        if (item.settingCategoryCollectionRenderer) {
          const sw = w.tag(6, Wire.LengthDelimited).fork();
          const cw = sw.tag(66930374, Wire.LengthDelimited).fork();
          if (item.settingCategoryCollectionRenderer.categoryId) {
            cw.tag(4, Wire.Varint).int32(item.settingCategoryCollectionRenderer.categoryId);
          }
          if (item.settingCategoryCollectionRenderer.categoryId === 10135) {
            const sub = cw.tag(3, Wire.LengthDelimited).fork();
            const subR = sub.tag(61331416, Wire.LengthDelimited).fork();
            subR.tag(15, Wire.Varint).int32(0);
            const enableEp = subR.tag(5, Wire.LengthDelimited).fork();
            const setEp = enableEp.tag(81212182, Wire.LengthDelimited).fork();
            const sData = setEp.tag(1, Wire.LengthDelimited).fork();
            const enumV = sData.tag(1, Wire.LengthDelimited).fork();
            enumV.tag(1, Wire.Varint).int32(151);
            enumV.join();
            sData.tag(3, Wire.Varint).bool(true);
            sData.join();
            setEp.join();
            enableEp.join();
            subR.join();
            sub.join();
          }
          cw.join();
          sw.join();
        }
      }
    }
  };

  // Shorts Messages
  const ShortsType = new class extends BaseMessage {
    create() { return { entries: [] }; }
    read(r, m, len) {
      const end = r.pos + len;
      while (r.pos < end) {
        const [no, wire] = r.tag();
        if (no === 2) {
          const eEnd = r.pos + r.uint32();
          const entry = {};
          while (r.pos < eEnd) {
            const [eNo, eWire] = r.tag();
            if (eNo === 1) {
              const cEnd = r.pos + r.uint32();
              entry.command = {};
              while (r.pos < cEnd) {
                const [cNo, cWire] = r.tag();
                if (cNo === 139608561) {
                  const rwEnd = r.pos + r.uint32();
                  entry.command.reelWatchEndpoint = {};
                  while (r.pos < rwEnd) {
                    const [rwNo, rwWire] = r.tag();
                    if (rwNo === 8) {
                      entry.command.reelWatchEndpoint.overlay = {};
                      r.skip(rwWire);
                    } else r.skip(rwWire);
                  }
                } else r.skip(cWire);
              }
            } else r.skip(eWire);
          }
          m.entries.push(entry);
        } else r.skip(wire);
      }
      return m;
    }
    write(w, m) {
      for (const entry of m.entries) {
        if (entry.command?.reelWatchEndpoint?.overlay) {
          const ew = w.tag(2, Wire.LengthDelimited).fork();
          const cw = ew.tag(1, Wire.LengthDelimited).fork();
          const rw = cw.tag(139608561, Wire.LengthDelimited).fork();
          const ow = rw.tag(8, Wire.LengthDelimited).fork();
          ow.tag(139970731, Wire.LengthDelimited).fork().join();
          ow.join();
          rw.join();
          cw.join();
          ew.join();
        }
      }
    }
  };

  // --- BOYER-MOORE ZERO-ALLOCATION SCANNER ---
  const AD_SIG = new Uint8Array([112, 97, 103, 101, 97, 100]); // "pagead"
  const JUMP_TABLE = new Int32Array(256).fill(7);
  for (let i = 0; i < 6; i++) JUMP_TABLE[AD_SIG[i]] = 6 - i;

  function quickScanAd(bytes) {
    if (!bytes || bytes.length < 1000) return false;
    const len = bytes.length;
    let a = 0;
    while (a <= len - 6) {
      if (bytes[a] === 112 && bytes[a + 1] === 97 && bytes[a + 2] === 103 &&
          bytes[a + 3] === 101 && bytes[a + 4] === 97 && bytes[a + 5] === 100) return true;
      a += JUMP_TABLE[bytes[a + 6]] || 7;
    }
    return false;
  }

  // --- TRAVERSAL HELPER (ZERO-ARRAY RECURSION) ---
  function cleanRichItems(items) {
    if (!Array.isArray(items)) return;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      const unknowns = UnknownFieldHandler.list(it);
      let isAd = false;
      if (unknowns.length) {
        isAd = quickScanAd(unknowns[0].data);
      } else {
        const eml = it?.videoWithContextRenderer?.videoRendererContent?.renderInfo?.layoutRender?.eml || "";
        if (eml.includes("inline_injection_entrypoint_layout.eml") || (eml.includes("shorts") && !eml.includes("_pivot_item"))) {
          isAd = true;
        } else {
          const vContent = it?.videoWithContextRenderer?.videoRendererContent?.videoInfo?.videoContext?.videoContent;
          if (vContent) {
            const vUnknowns = UnknownFieldHandler.list(vContent);
            isAd = vUnknowns.some(u => quickScanAd(u.data));
          }
        }
      }
      if (isAd) items.splice(i, 1);
    }
  }

  function traverseAndClean(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node.richItemContents)) {
      cleanRichItems(node.richItemContents);
    }
    for (const key in node) {
      if (node[key] && typeof node[key] === "object") {
        traverseAndClean(node[key]);
      }
    }
  }

  // --- ROUTER & RUNTIME EXECUTOR ---
  const url = $request?.url || "";
  const rawBytes = $response?.bodyBytes || (typeof $response?.body === "string" ? TE.encode($response.body) : null);

  if (!rawBytes) {
    $done({});
    return;
  }

  try {
    let modified = false;
    let outBytes = null;

    if (url.includes("browse") || url.includes("next") || url.includes("search")) {
      const msg = BrowseType.fromBinary(rawBytes);
      traverseAndClean(msg);
      outBytes = BrowseType.toBinary(msg);
      modified = true;
    } else if (url.includes("player")) {
      const msg = PlayerType.fromBinary(rawBytes);
      outBytes = PlayerType.toBinary(msg);
      modified = true;
    } else if (url.includes("reel_watch_sequence")) {
      const msg = ShortsType.fromBinary(rawBytes);
      outBytes = ShortsType.toBinary(msg);
      modified = true;
    } else if (url.includes("guide")) {
      const msg = GuideType.fromBinary(rawBytes);
      const blocked = ["SPunlimited", "FEuploads", "FEmusic_immersive"];
      const cleanGuide = (items) => {
        for (const it of items) {
          const list = it?.guideSectionRenderer?.rendererItems;
          if (Array.isArray(list)) {
            for (let i = list.length - 1; i >= 0; i--) {
              const id = list[i]?.iconRender?.browseId || list[i]?.labelRender?.browseId;
              if (id && blocked.includes(id)) list.splice(i, 1);
            }
          }
        }
      };
      cleanGuide(msg.labelItems);
      cleanGuide(msg.iconItems);
      outBytes = GuideType.toBinary(msg);
      modified = true;
    } else if (url.includes("get_setting")) {
      const msg = SettingType.fromBinary(rawBytes);
      outBytes = SettingType.toBinary(msg);
      modified = true;
    }

    if (modified && outBytes) {
      $done({ bodyBytes: outBytes });
    } else {
      $done({});
    }
  } catch (err) {
    $done({});
  }
})();
