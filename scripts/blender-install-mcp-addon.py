import os
import importlib
import site
import subprocess
import sys
from pathlib import Path

import addon_utils
import bpy


PACKAGE_SPECS = [
    ("fastapi", "fastapi"),
    ("uvicorn[standard]", "uvicorn"),
    ("pydantic", "pydantic"),
    ("docstring-parser", "docstring_parser"),
    ("numpy", "numpy"),
    ("polymcp", "polymcp"),
]

SOURCE_PATCHES = [
    ("AUTO_INSTALL_PACKAGES = True", "AUTO_INSTALL_PACKAGES = False"),
    ("POLYMCP_PATH = r'your_path'", "POLYMCP_PATH = r''"),
    (
        "        if Config.POLYMCP_PATH not in sys.path:\n            sys.path.append(Config.POLYMCP_PATH)\n            \n        import uvicorn\n        from fastapi import FastAPI, HTTPException\n        from polymcp_toolkit import expose_tools\n        import numpy as np\n        logger.info(\"✓ All packages loaded successfully\")",
        "        if Config.POLYMCP_PATH and Config.POLYMCP_PATH not in sys.path:\n            sys.path.append(Config.POLYMCP_PATH)\n\n        import uvicorn\n        from fastapi import FastAPI, HTTPException\n        try:\n            from polymcp import expose_tools_http as expose_tools\n        except ImportError:\n            try:\n                from polymcp.polymcp_toolkit import expose_tools_http as expose_tools\n            except ImportError:\n                from polymcp.polymcp_toolkit.expose import expose_tools\n        import numpy as np\n        logger.info(\"✓ All packages loaded successfully\")",
    ),
    ("        render.render.filepath = output_path", "        scene.render.filepath = output_path"),
    (
        "    # Create camera object\n    cam_obj = bpy.data.objects.new(name or \"Camera\", cam_data)\n    cam_obj.location = location\n    cam_obj.rotation_euler = [math.radians(r) for r in rotation]\n    \n    bpy.context.collection.objects.link(cam_obj)\n    \n    # Calculate field of view",
        "    # Create camera object\n    cam_obj = bpy.data.objects.new(name or \"Camera\", cam_data)\n    cam_obj.location = location\n    cam_obj.rotation_euler = [math.radians(r) for r in rotation]\n    \n    bpy.context.collection.objects.link(cam_obj)\n    bpy.context.scene.camera = cam_obj\n    \n    # Calculate field of view",
    ),
]


def resolve_addon_path() -> Path:
    explicit = os.environ.get("BLENDER_MCP_ADDON_FILE")
    if explicit:
        return Path(explicit).expanduser().resolve()

    return Path("/Users/cloud/Code/Blender-MCP-Server/blender_mcp.py")


def ensure_blender_python_packages() -> None:
    python_executable = sys.executable
    site_packages = site.getsitepackages()[0]
    missing_packages = []

    for requirement, module_name in PACKAGE_SPECS:
        try:
            importlib.import_module(module_name)
        except Exception:
            missing_packages.append(requirement)

    if not missing_packages:
        print("[blender-install-mcp-addon] python_packages=ok")
        return

    print(f"[blender-install-mcp-addon] installing_missing_packages={missing_packages}")
    subprocess.check_call([python_executable, "-m", "ensurepip"])
    subprocess.check_call(
        [
            python_executable,
            "-m",
            "pip",
            "install",
            "--target",
            site_packages,
            *missing_packages,
        ]
    )


def build_compatible_addon_file(source_path: Path) -> Path:
    generated_dir = Path(__file__).resolve().parent / "_generated"
    generated_dir.mkdir(parents=True, exist_ok=True)
    target_path = generated_dir / "blender_mcp.py"
    source = source_path.read_text(encoding="utf8")

    for old, new in SOURCE_PATCHES:
        source = source.replace(old, new)

    target_path.write_text(source, encoding="utf8")
    return target_path


def ensure_addon_enabled(addon_path: Path) -> str:
    module_name = addon_path.stem
    addons_dir = Path(bpy.utils.user_resource("SCRIPTS", path="addons", create=True))
    installed_addon_path = addons_dir / addon_path.name
    generated_source = addon_path.read_text(encoding="utf8")
    installed_source = (
        installed_addon_path.read_text(encoding="utf8")
        if installed_addon_path.exists()
        else None
    )
    needs_install = generated_source != installed_source
    enabled, loaded = addon_utils.check(module_name)

    print(f"[blender-install-mcp-addon] addons_dir={addons_dir}")
    print(f"[blender-install-mcp-addon] needs_install={needs_install}")
    print(f"[blender-install-mcp-addon] enabled={enabled} loaded={loaded}")

    if needs_install:
        if loaded:
            addon_utils.disable(module_name, default_set=True)
        bpy.ops.preferences.addon_install(filepath=str(addon_path), overwrite=True)

    if needs_install or not enabled or not loaded:
        addon_utils.enable(module_name, default_set=True, persistent=True)
        bpy.ops.wm.save_userpref()

    enabled, loaded = addon_utils.check(module_name)
    if not (enabled and loaded):
        raise RuntimeError(f"Addon {module_name} was not enabled correctly.")

    return module_name


def main() -> None:
    source_addon_path = resolve_addon_path()
    if not source_addon_path.exists():
        raise FileNotFoundError(f"Blender MCP addon not found: {source_addon_path}")

    ensure_blender_python_packages()
    addon_path = build_compatible_addon_file(source_addon_path)

    print(f"[blender-install-mcp-addon] source_addon_path={source_addon_path}")
    print(f"[blender-install-mcp-addon] addon_path={addon_path}")
    module_name = ensure_addon_enabled(addon_path)

    print(f"[blender-install-mcp-addon] enabled={module_name}")


if __name__ == "__main__":
    main()
