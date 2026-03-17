const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    // WebUI static library
    const webui_lib = b.addStaticLibrary(.{
        .name = "webui",
        .target = target,
        .optimize = optimize,
    });

    // Add webui C source files
    const webui_flags = &.{
        "-DNO_CACHING",
        "-DNO_CGI",
        "-DUSE_WEBSOCKET",
        "-DNO_SSL",
        "-Wno-error=date-time",
    };

    webui_lib.addCSourceFile(.{
        .file = b.path("thirdparty/webui/src/webui.c"),
        .flags = webui_flags,
    });

    webui_lib.addCSourceFile(.{
        .file = b.path("thirdparty/webui/src/civetweb/civetweb.c"),
        .flags = webui_flags,
    });

    webui_lib.addIncludePath(b.path("thirdparty/webui/include"));
    webui_lib.linkLibC();

    // Platform-specific linking
    if (target.result.os.tag == .windows) {
        webui_lib.linkSystemLibrary("ws2_32");
        webui_lib.linkSystemLibrary("ole32");
        webui_lib.linkSystemLibrary("Advapi32");
        webui_lib.linkSystemLibrary("Shell32");
        webui_lib.linkSystemLibrary("user32");
    } else if (target.result.os.tag == .macos) {
        webui_lib.addCSourceFile(.{
            .file = b.path("thirdparty/webui/src/webview/wkwebview.m"),
            .flags = &.{},
        });
        webui_lib.linkFramework("Cocoa");
        webui_lib.linkFramework("WebKit");
    }

    // WebUI module - Zig bindings
    const webui_mod = b.createModule(.{
        .root_source_file = b.path("thirdparty/webui/src/webui.zig"),
        .target = target,
        .optimize = optimize,
    });
    webui_mod.addIncludePath(b.path("thirdparty/webui/include"));

    // Main executable module
    const exe_mod = b.createModule(.{
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });

    exe_mod.addImport("webui", webui_mod);

    const exe = b.addExecutable(.{
        .name = "zig_webui_angular_rspack",
        .root_module = exe_mod,
    });

    exe.linkLibrary(webui_lib);
    exe.addIncludePath(b.path("thirdparty/webui/include"));

    b.installArtifact(exe);

    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());

    if (b.args) |args| {
        run_cmd.addArgs(args);
    }

    const run_step = b.step("run", "Run the app");
    run_step.dependOn(&run_cmd.step);

    // Test step
    const exe_unit_tests = b.addTest(.{
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });

    const run_exe_unit_tests = b.addRunArtifact(exe_unit_tests);

    const test_step = b.step("test", "Run unit tests");
    test_step.dependOn(&run_exe_unit_tests.step);
}
