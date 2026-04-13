import json
import math
import os
import shutil
import subprocess
from pathlib import Path

import bpy
from mathutils import Matrix


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
CONTRACT_FILE = PROJECT_ROOT / os.environ.get(
    "FOX_BASE_CONTRACT_FILE",
    "assets/fox-base/fox-base-v10.contract.json",
)
USDZIP_BIN = Path(os.environ.get("USDZIP_BIN", "/usr/bin/usdzip"))
HIDDEN_SCALE = (0.001, 0.001, 0.001)
VISIBLE_SCALE = (1.0, 1.0, 1.0)


def load_contract():
    return json.loads(CONTRACT_FILE.read_text(encoding="utf-8"))


CONTRACT = load_contract()
TEMPLATE_VERSION = CONTRACT["templateVersion"]
RECIPE_DEFAULTS = CONTRACT["recipeDefaults"]
POSTER_RENDER = CONTRACT["posterRender"]
OBJECT_MAP = CONTRACT["objects"]
OBJECT_NAMES = list(OBJECT_MAP.values())
STAGE_OBJECT_NAMES = [
    CONTRACT["stageObjects"]["plane"],
    CONTRACT["stageObjects"]["importedCamera"],
    CONTRACT["stageObjects"]["sun"],
    CONTRACT["stageObjects"]["keyLight"],
    CONTRACT["stageObjects"]["rimLight"],
]
SOURCE_MATERIAL_NAMES = list(CONTRACT["sourceMaterials"].values())
ACCESSORY_OBJECT_KEYS = [
    key for key in OBJECT_MAP.keys() if key.startswith("accessory")
]
ASSET_EXPORT_SCALE_FACTOR = CONTRACT.get("assetExportScaleFactor", 1.0)
ASSET_EXPORT_FACING_ROTATION = CONTRACT.get("assetExportFacingRotation", [0, 0, 0])


def hex_to_rgba(hex_value):
    value = hex_value.replace("#", "")
    if len(value) != 6:
        raise ValueError(f"Expected 6-char hex color, got {hex_value}")

    return tuple(int(value[index : index + 2], 16) / 255 for index in range(0, 6, 2)) + (
        1.0,
    )


THEME_FIXTURES = {
    "lucky-charm": {
        "label": "幸运守护",
        "file_basename": f"{TEMPLATE_VERSION}-lucky-charm",
        "visible_accessory": "accessoryBell",
        "palette": {
            "body": "#D49F73",
            "face": "#FFF0E5",
            "accent": "#8F5843",
            "eye": "#2A1C18",
            "glow": "#FFD89B",
            "accessory": "#E0B44F",
        },
        "roughness": {
            "body": 0.44,
            "face": 0.5,
            "accent": 0.32,
            "eye": 0.12,
            "glow": 0.24,
            "accessory": 0.26,
        },
        "emission": {
            "body": 0.05,
            "accent": 0.08,
            "eye": 0.12,
            "glow": 0.32,
            "accessory": 0.08,
        },
        "tail_tip_scale_factor": 1.04,
        "eye_scale_factor": 1.02,
    },
    "cream-toy": {
        "label": "奶油玩具",
        "file_basename": f"{TEMPLATE_VERSION}-cream-toy",
        "visible_accessory": "accessoryTag",
        "palette": {
            "body": "#D9B48D",
            "face": "#FFF1E3",
            "accent": "#8B5B46",
            "eye": "#2A1C18",
            "glow": "#FFD4AF",
            "accessory": "#D6B06B",
        },
        "roughness": {
            "body": 0.42,
            "face": 0.5,
            "accent": 0.35,
            "eye": 0.12,
            "glow": 0.24,
            "accessory": 0.3,
        },
        "emission": {
            "body": 0.04,
            "accent": 0.04,
            "eye": 0.08,
            "glow": 0.2,
            "accessory": 0.05,
        },
        "tail_tip_scale_factor": 1.0,
        "eye_scale_factor": 1.03,
    },
    "forest-scout": {
        "label": "森林巡游",
        "file_basename": f"{TEMPLATE_VERSION}-forest-scout",
        "visible_accessory": "accessoryScarf",
        "palette": {
            "body": "#B58E60",
            "face": "#F6EFE3",
            "accent": "#597355",
            "eye": "#1D1A19",
            "glow": "#CDE1B4",
            "accessory": "#5D7B54",
        },
        "roughness": {
            "body": 0.68,
            "face": 0.72,
            "accent": 0.6,
            "eye": 0.2,
            "glow": 0.42,
            "accessory": 0.58,
        },
        "emission": {
            "body": 0.0,
            "accent": 0.0,
            "eye": 0.02,
            "glow": 0.0,
            "accessory": 0.0,
        },
        "tail_tip_scale_factor": 1.02,
        "eye_scale_factor": 0.98,
    },
    "night-glow": {
        "label": "夜灯精灵",
        "file_basename": f"{TEMPLATE_VERSION}-night-glow",
        "visible_accessory": "accessoryCrown",
        "palette": {
            "body": "#B891D7",
            "face": "#FCF2FA",
            "accent": "#6F57C0",
            "eye": "#261723",
            "glow": "#FFBEDA",
            "accessory": "#F6DEFF",
        },
        "roughness": {
            "body": 0.34,
            "face": 0.36,
            "accent": 0.22,
            "eye": 0.08,
            "glow": 0.14,
            "accessory": 0.18,
        },
        "emission": {
            "body": 0.12,
            "accent": 0.64,
            "eye": 0.44,
            "glow": 1.6,
            "accessory": 0.68,
        },
        "tail_tip_scale_factor": 1.08,
        "eye_scale_factor": 1.05,
    },
    "strawberry-sweet": {
        "label": "草莓甜点",
        "file_basename": f"{TEMPLATE_VERSION}-strawberry-sweet",
        "visible_accessory": "accessoryFlower",
        "palette": {
            "body": "#DFA4AF",
            "face": "#FFF2F5",
            "accent": "#B55E72",
            "eye": "#322125",
            "glow": "#FFC4D8",
            "accessory": "#ED839B",
        },
        "roughness": {
            "body": 0.45,
            "face": 0.48,
            "accent": 0.34,
            "eye": 0.12,
            "glow": 0.2,
            "accessory": 0.32,
        },
        "emission": {
            "body": 0.04,
            "accent": 0.08,
            "eye": 0.12,
            "glow": 0.48,
            "accessory": 0.18,
        },
        "tail_tip_scale_factor": 1.04,
        "eye_scale_factor": 1.05,
    },
}


def resolve_from_project(relative_path):
    return PROJECT_ROOT / relative_path


SOURCE_BLEND = resolve_from_project(CONTRACT["sourceBlendFile"])
EXPORT_GLB = resolve_from_project(CONTRACT["exportFiles"]["modelFile"])
EXPORT_RUNTIME_GLB = resolve_from_project(
    CONTRACT["exportFiles"].get("runtimeTemplateFile", CONTRACT["exportFiles"]["modelFile"])
)
EXPORT_USD = resolve_from_project(CONTRACT["exportFiles"]["usdFile"])
EXPORT_USDZ = resolve_from_project(CONTRACT["exportFiles"]["usdzFile"])
EXPORT_POSTER = resolve_from_project(CONTRACT["exportFiles"]["posterFile"])
EXPORT_STAGE_GLB = resolve_from_project(CONTRACT["exportFiles"]["stageFile"])
PUBLIC_GLB = resolve_from_project(CONTRACT["demoFiles"]["modelPath"])
PUBLIC_USDZ = resolve_from_project(CONTRACT["demoFiles"]["usdzPath"])
PUBLIC_POSTER = resolve_from_project(CONTRACT["demoFiles"]["posterPath"])


def get_fixture_paths(file_basename):
    export_dir = PROJECT_ROOT / "assets" / "fox-base" / "export"
    public_dir = PROJECT_ROOT / "public" / "demo"
    return {
        "glb": export_dir / f"{file_basename}.glb",
        "usd": export_dir / f"{file_basename}.usd",
        "usdz": export_dir / f"{file_basename}.usdz",
        "poster": export_dir / f"{file_basename}-poster.png",
        "public_glb": public_dir / f"{file_basename}.glb",
        "public_usdz": public_dir / f"{file_basename}.usdz",
        "public_poster": public_dir / f"{file_basename}-poster.png",
    }


def ensure_directories():
    for file_path in (
        EXPORT_GLB,
        EXPORT_RUNTIME_GLB,
        EXPORT_USD,
        EXPORT_USDZ,
        EXPORT_POSTER,
        EXPORT_STAGE_GLB,
        PUBLIC_GLB,
        PUBLIC_USDZ,
        PUBLIC_POSTER,
    ):
        file_path.parent.mkdir(parents=True, exist_ok=True)

    for fixture in THEME_FIXTURES.values():
        for file_path in get_fixture_paths(fixture["file_basename"]).values():
            file_path.parent.mkdir(parents=True, exist_ok=True)


def open_source_blend():
    if not SOURCE_BLEND.exists():
        raise FileNotFoundError(f"Missing source blend: {SOURCE_BLEND}")

    bpy.ops.wm.open_mainfile(filepath=str(SOURCE_BLEND))


def require_objects(names, label):
    missing = [name for name in names if name not in bpy.data.objects]

    if missing:
        raise RuntimeError(f"Missing {label} objects: {', '.join(missing)}")


def require_materials(names):
    missing = [name for name in names if name not in bpy.data.materials]

    if missing:
        raise RuntimeError(f"Missing source materials: {', '.join(missing)}")


def select_named_objects(names):
    bpy.ops.object.select_all(action="DESELECT")
    selected = [bpy.data.objects[name] for name in names]

    for obj in selected:
        obj.select_set(True)

    bpy.context.view_layer.objects.active = selected[0]


def snapshot_object_matrices(names):
    return {name: bpy.data.objects[name].matrix_world.copy() for name in names}


def restore_object_matrices(snapshot):
    for name, matrix in snapshot.items():
        bpy.data.objects[name].matrix_world = matrix

    bpy.context.view_layer.update()


def build_export_matrix():
    scale_factor = float(ASSET_EXPORT_SCALE_FACTOR)
    rotation = ASSET_EXPORT_FACING_ROTATION
    transform = Matrix.Identity(4)

    if scale_factor != 1.0:
        transform = Matrix.Diagonal((scale_factor, scale_factor, scale_factor, 1.0))

    rotation_matrix = (
        Matrix.Rotation(math.radians(rotation[0]), 4, "X")
        @ Matrix.Rotation(math.radians(rotation[1]), 4, "Y")
        @ Matrix.Rotation(math.radians(rotation[2]), 4, "Z")
    )

    return rotation_matrix @ transform


def apply_export_transform(names):
    transform = build_export_matrix()

    for name in names:
        obj = bpy.data.objects[name]
        obj.matrix_world = transform @ obj.matrix_world

    bpy.context.view_layer.update()


def configure_scene_camera():
    camera_name = CONTRACT["stageObjects"]["importedCamera"]
    camera = bpy.data.objects.get(camera_name)

    if camera is None or camera.type != "CAMERA":
        raise RuntimeError(f"Missing stage camera object: {camera_name}")

    camera.location = RECIPE_DEFAULTS["stageCameraLocation"]
    camera.rotation_euler = [
        math.radians(value) for value in RECIPE_DEFAULTS["stageCameraRotation"]
    ]
    camera.data.lens = RECIPE_DEFAULTS["stageCameraFocalLength"]
    bpy.context.scene.camera = camera
    bpy.context.view_layer.update()


def configure_render(output_path):
    scene = bpy.context.scene

    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except Exception:
        scene.render.engine = "BLENDER_EEVEE"

    scene.render.image_settings.file_format = POSTER_RENDER["fileFormat"]
    scene.render.image_settings.color_mode = POSTER_RENDER["colorMode"]
    scene.render.film_transparent = POSTER_RENDER["transparent"]
    scene.render.resolution_x = POSTER_RENDER["resolutionX"]
    scene.render.resolution_y = POSTER_RENDER["resolutionY"]
    scene.render.resolution_percentage = 100
    scene.render.filepath = str(output_path)
    scene.view_settings.look = "None"
    scene.view_settings.exposure = RECIPE_DEFAULTS["renderExposure"]
    scene.view_settings.gamma = RECIPE_DEFAULTS["renderGamma"]

    if hasattr(scene, "eevee") and hasattr(scene.eevee, "taa_render_samples"):
        scene.eevee.taa_render_samples = POSTER_RENDER["samples"]


def export_pet_assets(glb_path, usd_path=None):
    snapshot = snapshot_object_matrices(OBJECT_NAMES)

    try:
        apply_export_transform(OBJECT_NAMES)
        select_named_objects(OBJECT_NAMES)
        bpy.ops.export_scene.gltf(
            filepath=str(glb_path),
            export_format="GLB",
            use_selection=True,
            export_apply=True,
            export_yup=True,
            export_texcoords=True,
            export_normals=True,
            export_materials="EXPORT",
            export_lights=False,
            export_cameras=False,
            export_draco_mesh_compression_enable=True,
            export_draco_mesh_compression_level=6,
        )

        if usd_path is not None:
            bpy.ops.wm.usd_export(
                filepath=str(usd_path),
                selected_objects_only=True,
                export_materials=True,
            )
    finally:
        restore_object_matrices(snapshot)


def export_stage_asset():
    select_named_objects(STAGE_OBJECT_NAMES)
    bpy.ops.export_scene.gltf(
        filepath=str(EXPORT_STAGE_GLB),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_materials="EXPORT",
        export_lights=True,
        export_cameras=True,
    )


def package_usdz(usd_path, usdz_path):
    if usdz_path.exists():
        usdz_path.unlink()

    candidate_commands = [
        [str(USDZIP_BIN), str(usdz_path), "--arkitAsset", str(usd_path)],
        [str(USDZIP_BIN), "--arkitAsset", str(usd_path), str(usdz_path)],
    ]
    last_error = None

    for command in candidate_commands:
        try:
            subprocess.run(command, check=True, capture_output=True, text=True)
            if usdz_path.exists():
                return
        except subprocess.CalledProcessError as error:
            last_error = error.stderr.strip() or error.stdout.strip() or str(error)

    raise RuntimeError(f"Failed to build USDZ with usdzip: {last_error}")


def sync_demo_assets(glb_path, usdz_path, poster_path, public_glb, public_usdz, public_poster):
    shutil.copy2(glb_path, public_glb)
    shutil.copy2(usdz_path, public_usdz)
    shutil.copy2(poster_path, public_poster)


def set_material_surface(material_name, base_color, roughness, emission_color, emission_strength):
    material = bpy.data.materials.get(material_name)
    if material is None:
        raise RuntimeError(f"Missing material: {material_name}")

    material.use_nodes = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf is None:
        raise RuntimeError(f"Material missing Principled BSDF node: {material_name}")

    bsdf.inputs["Base Color"].default_value = base_color
    bsdf.inputs["Roughness"].default_value = roughness

    if "Emission Color" in bsdf.inputs:
        bsdf.inputs["Emission Color"].default_value = emission_color
    if "Emission Strength" in bsdf.inputs:
        bsdf.inputs["Emission Strength"].default_value = emission_strength


def assign_material(object_name, material_name):
    obj = bpy.data.objects[object_name]
    material = bpy.data.materials[material_name]

    if obj.data.materials:
        obj.data.materials[0] = material
    else:
        obj.data.materials.append(material)


def apply_accessory_visibility(visible_key):
    for key in ACCESSORY_OBJECT_KEYS:
        obj = bpy.data.objects[OBJECT_MAP[key]]
        obj.scale = VISIBLE_SCALE if key == visible_key else HIDDEN_SCALE


def show_all_accessories():
    for key in ACCESSORY_OBJECT_KEYS:
        bpy.data.objects[OBJECT_MAP[key]].scale = VISIBLE_SCALE
    bpy.context.view_layer.update()


def apply_theme_variant(config):
    materials = CONTRACT["sourceMaterials"]
    palette = {key: hex_to_rgba(value) for key, value in config["palette"].items()}

    set_material_surface(
        materials["body"],
        palette["body"],
        config["roughness"]["body"],
        palette["glow"],
        config["emission"]["body"],
    )
    set_material_surface(
        materials["face"],
        palette["face"],
        config["roughness"]["face"],
        palette["face"],
        0.0,
    )
    set_material_surface(
        materials["accent"],
        palette["accent"],
        config["roughness"]["accent"],
        palette["glow"],
        config["emission"]["accent"],
    )
    set_material_surface(
        materials["eye"],
        palette["eye"],
        config["roughness"]["eye"],
        palette["glow"],
        config["emission"]["eye"],
    )
    set_material_surface(
        materials["glow"],
        palette["glow"],
        config["roughness"]["glow"],
        palette["glow"],
        config["emission"]["glow"],
    )
    set_material_surface(
        materials["accessory"],
        palette["accessory"],
        config["roughness"]["accessory"],
        palette["glow"],
        config["emission"]["accessory"],
    )

    assign_material(OBJECT_MAP["body"], materials["body"])
    assign_material(OBJECT_MAP["head"], materials["body"])
    assign_material(OBJECT_MAP["tail"], materials["body"])
    assign_material(OBJECT_MAP["chest"], materials["face"])
    assign_material(OBJECT_MAP["muzzle"], materials["face"])
    assign_material(OBJECT_MAP["nose"], materials["accent"])
    assign_material(OBJECT_MAP["eyeLeft"], materials["eye"])
    assign_material(OBJECT_MAP["eyeRight"], materials["eye"])
    assign_material(OBJECT_MAP["tailTip"], materials["glow"])

    for key in ACCESSORY_OBJECT_KEYS:
        assign_material(OBJECT_MAP[key], materials["accessory"])

    apply_accessory_visibility(config["visible_accessory"])
    bpy.data.objects[OBJECT_MAP["tailTip"]].scale = (
        1.16 * config["tail_tip_scale_factor"],
        1.0 * config["tail_tip_scale_factor"],
        1.05 * config["tail_tip_scale_factor"],
    )
    bpy.data.objects[OBJECT_MAP["eyeLeft"]].scale = (
        1.08 * config["eye_scale_factor"],
        1.08 * config["eye_scale_factor"],
        1.08 * config["eye_scale_factor"],
    )
    bpy.data.objects[OBJECT_MAP["eyeRight"]].scale = (
        1.08 * config["eye_scale_factor"],
        1.08 * config["eye_scale_factor"],
        1.08 * config["eye_scale_factor"],
    )
    bpy.context.view_layer.update()


def export_variant_fixture(theme_key, config):
    fixture_paths = get_fixture_paths(config["file_basename"])
    open_source_blend()
    require_objects(OBJECT_NAMES, "pet")
    require_objects(STAGE_OBJECT_NAMES, "stage")
    require_materials(SOURCE_MATERIAL_NAMES)
    apply_theme_variant(config)
    configure_scene_camera()
    configure_render(fixture_paths["poster"])
    bpy.ops.render.render(write_still=True)
    export_pet_assets(fixture_paths["glb"], fixture_paths["usd"])
    package_usdz(fixture_paths["usd"], fixture_paths["usdz"])
    sync_demo_assets(
        fixture_paths["glb"],
        fixture_paths["usdz"],
        fixture_paths["poster"],
        fixture_paths["public_glb"],
        fixture_paths["public_usdz"],
        fixture_paths["public_poster"],
    )
    print(f"Exported fixture {theme_key}: {fixture_paths['public_poster']}")


def export_runtime_template():
    open_source_blend()
    require_objects(OBJECT_NAMES, "pet")
    require_objects(STAGE_OBJECT_NAMES, "stage")
    require_materials(SOURCE_MATERIAL_NAMES)
    apply_theme_variant(THEME_FIXTURES["lucky-charm"])
    show_all_accessories()
    select_named_objects([OBJECT_MAP[key] for key in ACCESSORY_OBJECT_KEYS])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    export_pet_assets(EXPORT_RUNTIME_GLB)


def main():
    ensure_directories()
    open_source_blend()
    require_objects(OBJECT_NAMES, "pet")
    require_objects(STAGE_OBJECT_NAMES, "stage")
    require_materials(SOURCE_MATERIAL_NAMES)
    apply_theme_variant(THEME_FIXTURES["lucky-charm"])
    configure_scene_camera()
    configure_render(EXPORT_POSTER)
    bpy.ops.render.render(write_still=True)
    export_pet_assets(EXPORT_GLB, EXPORT_USD)
    export_stage_asset()
    package_usdz(EXPORT_USD, EXPORT_USDZ)
    export_runtime_template()

    for theme_key, config in THEME_FIXTURES.items():
        export_variant_fixture(theme_key, config)

    print(f"Validated source blend: {SOURCE_BLEND}")
    print(f"Exported model: {EXPORT_GLB}")
    print(f"Exported runtime template: {EXPORT_RUNTIME_GLB}")
    print(f"Exported stage: {EXPORT_STAGE_GLB}")
    print(f"Exported usdz: {EXPORT_USDZ}")
    print(f"Synced demo poster: {PUBLIC_POSTER}")


if __name__ == "__main__":
    main()
