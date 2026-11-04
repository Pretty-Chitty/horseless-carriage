import { Color, Mesh, MeshPhongMaterial, PlaneGeometry, RepeatWrapping } from "three";
import { ChitRenderSpec, StaticImage } from "@pretty-chitty/core";
import { feltArt } from "./art";
import { playerHex, PlayerColor, TABLE_Z } from "./consts";

// Every panel draws its own table (references/chits-and-rendering.md, "Every panel draws its own
// table"): greyscale floorboards multiplied by a tint — warm wood on the shared panels, and on a
// player's own panel the wood stained toward their colour, so it reads as whose panel this is
// without competing with the pieces (developer request). The plane is far
// bigger than any panel shows, centred on the panel chit, and does not enlarge the camera framing.
const TILE = 16; // world units per texture repeat: eight boards, each about two factory squares wide
const SHARED_TINT = "#b08a63"; // warm, worn floorboards

// A player's floor: the same boards, stained a little toward their colour.
function tintFor(color?: PlayerColor): string {
  const wood = new Color(SHARED_TINT);
  if (!color) return SHARED_TINT;
  return `#${wood.lerp(new Color(playerHex(color)), 0.38).getHexString()}`;
}

export function setupTable(spec: ChitRenderSpec, color?: PlayerColor): void {
  const size = 120;
  const tex = () => {
    const t = StaticImage.texture(feltArt, { rx: size / TILE, ry: size / TILE });
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    return t;
  };
  const mesh = new Mesh(new PlaneGeometry(size, size), new MeshPhongMaterial({ map: tex(), bumpMap: tex(), bumpScale: 0.4, color: tintFor(color), shininess: 4, specular: "#1c1c1c" }));
  // At table height whatever the panel chit's own height (its offsetZ is set before this is called).
  mesh.position.z = TABLE_Z - (spec.offsetZ ?? 0) - 0.001;
  mesh.receiveShadow = true;
  spec.ornaments.push(mesh);
}
