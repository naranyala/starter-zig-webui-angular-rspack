const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    // SQLite3 static library - using amalgamated source
    const sqlite_lib = b.addLibrary(.{
        .name = "sqlite3",
        .linkage = .static,
        .root_module = b.createModule(.{
            .target = target,
            .optimize = optimize,
        }),
    });
    sqlite_lib.addCSourceFile(.{
        .file = b.path("thirdparty/sqlite3/sqlite3.c"),
        .flags = &.{
            "-DSQLITE_THREADSAFE=1",
            "-DSQLITE_ENABLE_JSON1",
            "-DSQLITE_ENABLE_FTS5",
            "-Wno-unused-parameter",
            "-Wno-missing-field-initializers",
        },
    });
    sqlite_lib.addIncludePath(b.path("thirdparty/sqlite3"));
    sqlite_lib.linkLibC();
    sqlite_lib.installHeader(b.path("thirdparty/sqlite3/sqlite3.h"), "sqlite3.h");

    // WebUI static library
    const webui_lib = b.addLibrary(.{
        .name = "webui",
        .linkage = .static,
        .root_module = b.createModule(.{
            .target = target,
            .optimize = optimize,
        }),
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

    // Errors module - shared across all modules
    const errors_mod = b.createModule(.{
        .root_source_file = b.path("src/errors.zig"),
        .target = target,
        .optimize = optimize,
    });

    // Logger module - shared across all modules
    const logger_mod = b.createModule(.{
        .root_source_file = b.path("src/logger.zig"),
        .target = target,
        .optimize = optimize,
    });
    logger_mod.addImport("errors", errors_mod);

    // Utilities module
    const utils_mod = b.createModule(.{
        .root_source_file = b.path("src/utils/utils.zig"),
        .target = target,
        .optimize = optimize,
    });
    utils_mod.addIncludePath(b.path("thirdparty/webui/include"));
    utils_mod.addImport("errors", errors_mod);

    // SQLite module - Zig bindings
    const sqlite_mod = b.createModule(.{
        .root_source_file = b.path("src/db/sqlite.zig"),
        .target = target,
        .optimize = optimize,
    });
    sqlite_mod.addIncludePath(b.path("thirdparty/sqlite3"));
    sqlite_mod.addImport("errors", errors_mod);

    // DuckDB module - Zig bindings
    const duckdb_mod = b.createModule(.{
        .root_source_file = b.path("src/db/duckdb.zig"),
        .target = target,
        .optimize = optimize,
    });
    duckdb_mod.addIncludePath(b.path("thirdparty/duckdb"));
    duckdb_mod.addImport("errors", errors_mod);

    // Security module
    const security_mod = b.createModule(.{
        .root_source_file = b.path("src/utils/security.zig"),
        .target = target,
        .optimize = optimize,
    });
    security_mod.addImport("errors", errors_mod);

    // Repository module
    const repository_mod = b.createModule(.{
        .root_source_file = b.path("src/repositories/repository.zig"),
        .target = target,
        .optimize = optimize,
    });
    repository_mod.addImport("errors", errors_mod);

    // User repository module
    const user_repo_mod = b.createModule(.{
        .root_source_file = b.path("src/repositories/user_repository.zig"),
        .target = target,
        .optimize = optimize,
    });
    user_repo_mod.addImport("errors", errors_mod);
    user_repo_mod.addImport("sqlite", sqlite_mod);

    // User service module
    const user_service_mod = b.createModule(.{
        .root_source_file = b.path("src/services/user_service.zig"),
        .target = target,
        .optimize = optimize,
    });
    user_service_mod.addImport("errors", errors_mod);

    // Database handlers module
    const db_handlers_mod = b.createModule(.{
        .root_source_file = b.path("src/handlers/db_handlers.zig"),
        .target = target,
        .optimize = optimize,
    });
    db_handlers_mod.addImport("webui", webui_mod);
    db_handlers_mod.addImport("sqlite", sqlite_mod);
    db_handlers_mod.addImport("duckdb", duckdb_mod);
    db_handlers_mod.addImport("errors", errors_mod);
    db_handlers_mod.addImport("logger", logger_mod);
    db_handlers_mod.addImport("user_service", user_service_mod);
    db_handlers_mod.addImport("security", security_mod);

    // DI module
    const di_mod = b.createModule(.{
        .root_source_file = b.path("src/di.zig"),
        .target = target,
        .optimize = optimize,
    });
    di_mod.addImport("errors", errors_mod);
    di_mod.addImport("webui", webui_mod);

    // Main executable module
    const exe_mod = b.createModule(.{
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });

    exe_mod.addImport("webui", webui_mod);
    exe_mod.addImport("utils", utils_mod);
    exe_mod.addImport("sqlite", sqlite_mod);
    exe_mod.addImport("db_handlers", db_handlers_mod);
    exe_mod.addImport("di", di_mod);
    exe_mod.addImport("errors", errors_mod);
    exe_mod.addImport("user_service", user_service_mod);

    const exe = b.addExecutable(.{
        .name = "zig_webui_angular_rspack",
        .root_module = exe_mod,
    });

    exe.linkLibrary(webui_lib);
    exe.linkLibrary(sqlite_lib);
    exe.addIncludePath(b.path("thirdparty/webui/include"));
    exe.addIncludePath(b.path("thirdparty/sqlite3"));
    // DuckDB is disabled due to static linking issues with C++ standard library
    // exe.addIncludePath(b.path("thirdparty/duckdb"));
    // exe.addObjectFile(b.path("thirdparty/static-duckdb-libs-linux-amd64/libduckdb_static.a"));
    // exe.linkSystemLibrary("pthread");
    // exe.linkSystemLibrary("dl");
    // exe.linkLibC();
    // exe.linkLibCpp();
    // exe.linkSystemLibrary("stdc++");

    b.installArtifact(exe);

    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());

    if (b.args) |args| {
        run_cmd.addArgs(args);
    }

    const run_step = b.step("run", "Run the app");
    run_step.dependOn(&run_cmd.step);

    // Test step
    const test_module = b.createModule(.{
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });
    const exe_unit_tests = b.addTest(.{
        .root_module = test_module,
    });

    const run_exe_unit_tests = b.addRunArtifact(exe_unit_tests);

    const test_step = b.step("test", "Run unit tests");
    test_step.dependOn(&run_exe_unit_tests.step);
}
