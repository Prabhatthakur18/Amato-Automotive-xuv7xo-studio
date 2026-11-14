/* ==========================================================================
   Proposal content model (schema 2)

   {
     schema: 2, vehicle, brand:{logoLeft,logoRight},
     labels: { themeLabel, vehicleLabel, paletteLabel, seatTag },
     sections: [ { id, type: "gallery" | "seat" | "grid", title, sub } ],   // order = page order
     designs: [ {
       name, theme, tm, desc, palette:[{hex,label}],
       blocks: {                                   // one per section id
         <gallery id>: { items:[ {name, sub, img} ] },          // Front cabin / Rear cabin / Boot …
         <seat id>:    { img, callouts:[ {t, d, pos:{x,y}, img} ] },
         <grid id>:    { items:[ {name, img} ] }                // Door panel / Floor mats …
       }
     } ]
   }
   Older schema-1 content (fixed 3 angles / 6 elements) is migrated on load.
   ========================================================================== */

export const LIMITS = { designs: 8, sections: 10, gallery: 8, callouts: 10, grid: 16, palette: 4 };

export const SECTION_TYPES = {
  gallery: { label: "Image gallery", hint: "Switchable views, e.g. Front / Rear cabin" },
  seat:    { label: "Seat diagram",  hint: "One image with numbered detail callouts" },
  grid:    { label: "Card grid",     hint: "Cards with an image and a name" },
};

const MARKER_DEFAULTS = [{x:50,y:14},{x:40,y:30},{x:38,y:52},{x:62,y:42},{x:56,y:60},{x:66,y:74}];

export const newId = (p = "s") => p + Math.random().toString(36).slice(2, 8);

export const newItem = (type, i = 0) => ({
  gallery: () => ({ name: "New view", sub: "Describe this view", img: "" }),
  grid:    () => ({ name: "New element", img: "" }),
  seat:    () => ({ t: "New detail", d: "Describe this detail.", pos: { ...MARKER_DEFAULTS[i % 6] }, img: "" }),
}[type]());

export const newBlock = type => ({
  gallery: () => ({ items: [newItem("gallery")] }),
  grid:    () => ({ items: [newItem("grid")] }),
  seat:    () => ({ img: "", callouts: [] }),
}[type]());

export const newSection = type => ({
  id: newId(), type,
  title: { gallery: "New gallery", seat: "Seat detail", grid: "Cabin elements" }[type],
  sub: "Add a short subtitle",
});

/* list of a block that the admin can add/remove/reorder */
export const listKey = type => (type === "seat" ? "callouts" : "items");
export const listLimit = type => LIMITS[type === "seat" ? "callouts" : type];

/* --------------------------- migration v1 → v2 --------------------------- */
function fromV1(c){
  const S = c.sections || {};
  const sec = [
    { id: "interior",  type: "gallery", title: S.interior?.title  ?? "The Complete Interior", sub: S.interior?.sub  ?? "" },
    { id: "signature", type: "seat",    title: S.signature?.title ?? "The Signature — Seat Cover", sub: S.signature?.sub ?? "" },
    { id: "elements",  type: "grid",    title: S.elements?.title  ?? "Cabin Elements", sub: S.elements?.sub ?? "" },
  ];
  const keys = ["door", "floor", "dash", "steering", "boot", "rear"];
  const EL = c.elementLabels || {};
  return {
    schema: 2,
    vehicle: c.vehicle, brand: c.brand, labels: c.labels,
    sections: sec,
    designs: c.designs.map(d => ({
      name: d.name, theme: d.theme, tm: !!d.tm, desc: d.desc, palette: d.palette,
      blocks: {
        interior: { items: (c.angles || []).map((a, i) => ({ name: a.name, sub: a.sub, img: d.images?.[`angle${i + 1}`] || "" })) },
        signature: { img: d.images?.seat || "", callouts: d.callouts || [] },
        elements: { items: keys.map(k => ({ name: EL[k] || k, img: d.images?.[k] || "" })) },
      },
    })),
  };
}

/* Bring any content up to schema 2 and fill in anything missing. Mutates + returns. */
export function normalize(content){
  let c = content?.schema === 2 ? content : fromV1(content);
  c.labels = { themeLabel: "Design Theme", vehicleLabel: "Vehicle", paletteLabel: "Color Palette", seatTag: "Front Seat", ...(c.labels || {}) };
  c.brand = { logoLeft: "/assets/brand/amato.png", logoRight: "/assets/brand/mahindra.png", ...(c.brand || {}) };
  c.sections = Array.isArray(c.sections) ? c.sections : [];
  c.designs = Array.isArray(c.designs) && c.designs.length ? c.designs : [{ name: "Design", theme: "", desc: "", palette: [], blocks: {} }];
  for (const d of c.designs){
    d.palette = Array.isArray(d.palette) ? d.palette : [];
    d.blocks = d.blocks || {};
    for (const s of c.sections){
      const b = d.blocks[s.id] || (d.blocks[s.id] = newBlock(s.type));
      const k = listKey(s.type);
      if (!Array.isArray(b[k])) b[k] = [];
    }
  }
  return c;
}
