//! System Info Utility
//! Provides system information for desktop applications
//! Features: OS info, hardware info, memory, disk, network, battery

const std = @import("std");
const mem = std.mem;
const builtin = @import("std").builtin;
const posix = std.posix;
const fs = std.fs;
const time = std.time;

const log = std.log.scoped(.SystemInfo);

// ============================================================================
// Error Types
// ============================================================================

pub const SystemInfoError = error{
    Unavailable,
    PermissionDenied,
    NotFound,
    ParseFailed,
    NotSupported,
    OutOfMemory,
};

// ============================================================================
// OS Information
// ============================================================================

pub const OsType = enum {
    windows,
    macos,
    linux,
    freebsd,
    openbsd,
    netbsd,
    unknown,
};

pub const OsInfo = struct {
    os_type: OsType,
    name: []const u8,
    version: []const u8,
    arch: []const u8,
    kernel_version: []const u8,
    hostname: []const u8,
    username: []const u8,
    home_dir: []const u8,
    temp_dir: []const u8,

    pub fn deinit(self: *OsInfo, allocator: mem.Allocator) void {
        allocator.free(self.name);
        allocator.free(self.version);
        allocator.free(self.arch);
        allocator.free(self.kernel_version);
        allocator.free(self.hostname);
        allocator.free(self.username);
        allocator.free(self.home_dir);
        allocator.free(self.temp_dir);
    }
};

pub fn getOsInfo(allocator: mem.Allocator) SystemInfoError!OsInfo {
    return OsInfo{
        .os_type = getOsType(),
        .name = try getOsName(allocator),
        .version = try getOsVersion(allocator),
        .arch = try getArch(allocator),
        .kernel_version = try getKernelVersion(allocator),
        .hostname = try getHostname(allocator),
        .username = try getUsername(allocator),
        .home_dir = try getHomeDir(allocator),
        .temp_dir = try getTempDir(allocator),
    };
}

fn getOsType() OsType {
    return switch (builtin.os.tag) {
        .windows => .windows,
        .macos => .macos,
        .linux => .linux,
        .freebsd => .freebsd,
        .openbsd => .openbsd,
        .netbsd => .netbsd,
        else => .unknown,
    };
}

fn getOsName(allocator: mem.Allocator) SystemInfoError![]const u8 {
    return switch (builtin.os.tag) {
        .windows => allocator.dupe(u8, "Windows"),
        .macos => allocator.dupe(u8, "macOS"),
        .linux => getLinuxName(allocator),
        .freebsd => allocator.dupe(u8, "FreeBSD"),
        .openbsd => allocator.dupe(u8, "OpenBSD"),
        .netbsd => allocator.dupe(u8, "NetBSD"),
        else => allocator.dupe(u8, "Unknown"),
    };
}

fn getLinuxName(allocator: mem.Allocator) SystemInfoError![]const u8 {
    // Try /etc/os-release
    const content = fs.cwd().openFile("/etc/os-release", .{}) catch |err| {
        log.warn("Could not read /etc/os-release: {}", .{err});
        return allocator.dupe(u8, "Linux");
    };
    defer content.close();

    var reader = content.reader();
    var buf: [4096]u8 = undefined;
    const text = reader.readAll(&buf) catch return allocator.dupe(u8, "Linux");

    var lines = mem.tokenizeScalar(u8, text[0..buf.len], '\n');
    while (lines.next()) |line| {
        if (mem.startsWith(u8, line, "PRETTY_NAME=")) {
            const value = line["PRETTY_NAME=".len..];
            if (value.len >= 2 and value[0] == '"' and value[value.len - 1] == '"') {
                return allocator.dupe(u8, value[1 .. value.len - 1]);
            }
        }
    }

    return allocator.dupe(u8, "Linux");
}

fn getOsVersion(allocator: mem.Allocator) SystemInfoError![]const u8 {
    // Simplified - would need platform-specific implementations
    _ = allocator;
    return allocator.dupe(u8, builtin.os.version_string);
}

fn getArch(allocator: mem.Allocator) SystemInfoError![]const u8 {
    const arch_str = @tagName(builtin.cpu.arch);
    return allocator.dupe(u8, arch_str);
}

fn getKernelVersion(allocator: mem.Allocator) SystemInfoError![]const u8 {
    switch (builtin.os.tag) {
        .linux, .freebsd, .openbsd, .netbsd => {
            var buf: [256]u8 = undefined;
            const result = std.process.Child.run(.{
                .allocator = std.heap.page_allocator,
                .argv = &.{ "uname", "-r" },
                .stdout_behavior = .Pipe,
            }) catch return allocator.dupe(u8, "unknown");

            if (result.term_status == .Exited and result.Exited == 0) {
                const version = mem.trim(u8, result.stdout, " \n\r");
                return allocator.dupe(u8, version);
            }
        },
        .macos => {
            const result = std.process.Child.run(.{
                .allocator = std.heap.page_allocator,
                .argv = &.{ "uname", "-r" },
                .stdout_behavior = .Pipe,
            }) catch return allocator.dupe(u8, "unknown");

            if (result.term_status == .Exited and result.Exited == 0) {
                const version = mem.trim(u8, result.stdout, " \n\r");
                return allocator.dupe(u8, version);
            }
        },
        .windows => {
            return allocator.dupe(u8, "Windows NT");
        },
        else => {},
    }
    return allocator.dupe(u8, "unknown");
}

fn getHostname(allocator: mem.Allocator) SystemInfoError![]const u8 {
    var buf: [256]u8 = undefined;
    const hostname = posix.gethostname(&buf) catch return allocator.dupe(u8, "unknown");
    return allocator.dupe(u8, hostname);
}

fn getUsername(allocator: mem.Allocator) SystemInfoError![]const u8 {
    if (posix.getenv("USER")) |user| {
        return allocator.dupe(u8, user);
    }
    if (posix.getenv("USERNAME")) |username| {
        return allocator.dupe(u8, username);
    }
    return allocator.dupe(u8, "unknown");
}

fn getHomeDir(allocator: mem.Allocator) SystemInfoError![]const u8 {
    if (posix.getenv("HOME")) |home| {
        return allocator.dupe(u8, home);
    }
    if (posix.getenv("USERPROFILE")) |profile| {
        return allocator.dupe(u8, profile);
    }
    return allocator.dupe(u8, "");
}

fn getTempDir(allocator: mem.Allocator) SystemInfoError![]const u8 {
    if (posix.getenv("TMPDIR")) |tmp| {
        return allocator.dupe(u8, tmp);
    }
    if (posix.getenv("TEMP")) |temp| {
        return allocator.dupe(u8, temp);
    }
    if (posix.getenv("TMP")) |tmp| {
        return allocator.dupe(u8, tmp);
    }
    return switch (builtin.os.tag) {
        .windows => allocator.dupe(u8, "C:\\Windows\\Temp"),
        else => allocator.dupe(u8, "/tmp"),
    };
}

// ============================================================================
// Hardware Information
// ============================================================================

pub const CpuInfo = struct {
    model: []const u8,
    vendor: []const u8,
    cores: u32,
    threads: u32,
    frequency_mhz: u64,
    cache_l1: u32,
    cache_l2: u32,
    cache_l3: u32,
    flags: []const []const u8,

    pub fn deinit(self: *CpuInfo, allocator: mem.Allocator) void {
        allocator.free(self.model);
        allocator.free(self.vendor);
        for (self.flags) |flag| {
            allocator.free(flag);
        }
        allocator.free(self.flags);
    }
};

pub const MemoryInfo = struct {
    total_bytes: u64,
    used_bytes: u64,
    free_bytes: u64,
    available_bytes: u64,
    percent_used: f64,

    pub fn percentFree(self: *const MemoryInfo) f64 {
        return 100.0 - self.percent_used;
    }
};

pub fn getCpuInfo(allocator: mem.Allocator) SystemInfoError!CpuInfo {
    return CpuInfo{
        .model = try getCpuModel(allocator),
        .vendor = try getCpuVendor(allocator),
        .cores = getCoreCount(),
        .threads = getThreadCount(),
        .frequency_mhz = getCpuFrequency(),
        .cache_l1 = 0, // Platform-specific
        .cache_l2 = 0,
        .cache_l3 = 0,
        .flags = &.{},
    };
}

fn getCpuModel(allocator: mem.Allocator) SystemInfoError![]const u8 {
    switch (builtin.os.tag) {
        .linux => {
            const content = fs.cwd().openFile("/proc/cpuinfo", .{}) catch {
                return allocator.dupe(u8, "unknown");
            };
            defer content.close();

            var reader = content.reader();
            var buf: [4096]u8 = undefined;
            const text = reader.readAll(&buf) catch return allocator.dupe(u8, "unknown");

            var lines = mem.tokenizeScalar(u8, text[0..buf.len], '\n');
            while (lines.next()) |line| {
                if (mem.startsWith(u8, line, "model name")) {
                    const parts = mem.splitScalar(u8, line, ':');
                    _ = parts.next(); // skip "model name"
                    if (parts.next()) |value| {
                        return allocator.dupe(u8, mem.trim(u8, value, " \t"));
                    }
                }
            }
        },
        .macos => {
            const result = std.process.Child.run(.{
                .allocator = std.heap.page_allocator,
                .argv = &.{ "sysctl", "-n", "machdep.cpu.brand_string" },
                .stdout_behavior = .Pipe,
            }) catch return allocator.dupe(u8, "unknown");

            if (result.term_status == .Exited and result.Exited == 0) {
                const model = mem.trim(u8, result.stdout, " \n\r");
                return allocator.dupe(u8, model);
            }
        },
        else => {},
    }
    return allocator.dupe(u8, "unknown");
}

fn getCpuVendor(allocator: mem.Allocator) SystemInfoError![]const u8 {
    switch (builtin.os.tag) {
        .linux => {
            const content = fs.cwd().openFile("/proc/cpuinfo", .{}) catch {
                return allocator.dupe(u8, "unknown");
            };
            defer content.close();

            var reader = content.reader();
            var buf: [4096]u8 = undefined;
            const text = reader.readAll(&buf) catch return allocator.dupe(u8, "unknown");

            var lines = mem.tokenizeScalar(u8, text[0..buf.len], '\n');
            while (lines.next()) |line| {
                if (mem.startsWith(u8, line, "vendor_id")) {
                    const parts = mem.splitScalar(u8, line, ':');
                    _ = parts.next();
                    if (parts.next()) |value| {
                        return allocator.dupe(u8, mem.trim(u8, value, " \t"));
                    }
                }
            }
        },
        else => {},
    }
    return allocator.dupe(u8, "unknown");
}

fn getCoreCount() u32 {
    return @intCast(builtin.cpu.arch.coreCount());
}

fn getThreadCount() u32 {
    // Get logical CPU count
    return posix.sysconf(._SC_NPROCESSORS_ONLN) catch getCoreCount();
}

fn getCpuFrequency() u64 {
    switch (builtin.os.tag) {
        .linux => {
            const content = fs.cwd().openFile("/proc/cpuinfo", .{}) catch return 0;
            defer content.close();

            var reader = content.reader();
            var buf: [4096]u8 = undefined;
            const text = reader.readAll(&buf) catch return 0;

            var lines = mem.tokenizeScalar(u8, text[0..buf.len], '\n');
            while (lines.next()) |line| {
                if (mem.startsWith(u8, line, "cpu MHz")) {
                    const parts = mem.splitScalar(u8, line, ':');
                    _ = parts.next();
                    if (parts.next()) |value| {
                        const mhz = std.fmt.parseFloat(f64, mem.trim(u8, value, " \t")) catch return 0;
                        return @intFromFloat(mhz);
                    }
                }
            }
        },
        else => {},
    }
    return 0;
}

pub fn getMemoryInfo() SystemInfoError!MemoryInfo {
    switch (builtin.os.tag) {
        .linux => {
            const content = fs.cwd().openFile("/proc/meminfo", .{}) catch {
                return getMemoryInfoFallback();
            };
            defer content.close();

            var reader = content.reader();
            var buf: [4096]u8 = undefined;
            const text = reader.readAll(&buf) catch return getMemoryInfoFallback();

            var total: u64 = 0;
            var free: u64 = 0;
            var available: u64 = 0;
            var buffers: u64 = 0;
            var cached: u64 = 0;

            var lines = mem.tokenizeScalar(u8, text[0..buf.len], '\n');
            while (lines.next()) |line| {
                var parts = mem.tokenizeScalar(u8, line, ' ');
                const key = parts.next() orelse continue;
                const value_str = parts.next() orelse continue;
                const value = std.fmt.parseInt(u64, value_str, 10) catch continue;

                if (mem.eql(u8, key, "MemTotal:")) {
                    total = value * 1024;
                } else if (mem.eql(u8, key, "MemFree:")) {
                    free = value * 1024;
                } else if (mem.eql(u8, key, "MemAvailable:")) {
                    available = value * 1024;
                } else if (mem.eql(u8, key, "Buffers:")) {
                    buffers = value * 1024;
                } else if (mem.eql(u8, key, "Cached:")) {
                    cached = value * 1024;
                }
            }

            const used = total - (free + buffers + cached);
            const percent_used = @as(f64, @floatFromInt(used)) / @as(f64, @floatFromInt(total)) * 100.0;

            return MemoryInfo{
                .total_bytes = total,
                .used_bytes = used,
                .free_bytes = free,
                .available_bytes = available,
                .percent_used = percent_used,
            };
        },
        .macos => {
            const result = std.process.Child.run(.{
                .allocator = std.heap.page_allocator,
                .argv = &.{ "sysctl", "hw.memsize" },
                .stdout_behavior = .Pipe,
            }) catch return getMemoryInfoFallback();

            if (result.term_status == .Exited and result.Exited == 0) {
                const output = mem.trim(u8, result.stdout, " \n\r");
                const parts = mem.splitScalar(u8, output, ':');
                _ = parts.next();
                if (parts.next()) |value_str| {
                    const total = std.fmt.parseInt(u64, mem.trim(u8, value_str, " "), 10) catch return getMemoryInfoFallback();
                    // macOS doesn't easily provide used memory without vm_stat parsing
                    return MemoryInfo{
                        .total_bytes = total,
                        .used_bytes = 0,
                        .free_bytes = 0,
                        .available_bytes = 0,
                        .percent_used = 0,
                    };
                }
            }
        },
        else => {},
    }
    return getMemoryInfoFallback();
}

fn getMemoryInfoFallback() SystemInfoError!MemoryInfo {
    // Fallback - return zeros
    return MemoryInfo{
        .total_bytes = 0,
        .used_bytes = 0,
        .free_bytes = 0,
        .available_bytes = 0,
        .percent_used = 0,
    };
}

// ============================================================================
// Disk Information
// ============================================================================

pub const DiskInfo = struct {
    mount_point: []const u8,
    device: []const u8,
    fs_type: []const u8,
    total_bytes: u64,
    used_bytes: u64,
    free_bytes: u64,
    percent_used: f64,

    pub fn deinit(self: *DiskInfo, allocator: mem.Allocator) void {
        allocator.free(self.mount_point);
        allocator.free(self.device);
        allocator.free(self.fs_type);
    }
};

pub fn getDiskInfo(allocator: mem.Allocator, path: []const u8) SystemInfoError!DiskInfo {
    switch (builtin.os.tag) {
        .linux, .macos, .freebsd, .openbsd, .netbsd => {
            var stat: posix.StatVfs = undefined;
            posix.statvfs(path, &stat) catch {
                return SystemInfoError.NotFound;
            };

            const total = stat.blocks * stat.frsize;
            const free = stat.bfree * stat.frsize;
            const available = stat.bavail * stat.frsize;
            const used = total - free;
            const percent_used = @as(f64, @floatFromInt(used)) / @as(f64, @floatFromInt(total)) * 100.0;

            return DiskInfo{
                .mount_point = try allocator.dupe(u8, path),
                .device = try allocator.dupe(u8, "unknown"),
                .fs_type = try allocator.dupe(u8, "unknown"),
                .total_bytes = total,
                .used_bytes = used,
                .free_bytes = available,
                .percent_used = percent_used,
            };
        },
        .windows => {
            // Windows would use GetDiskFreeSpaceEx
            return SystemInfoError.NotSupported;
        },
        else => return SystemInfoError.NotSupported,
    }
}

// ============================================================================
// Network Information
// ============================================================================

pub const NetworkInterface = struct {
    name: []const u8,
    mac_address: ?[]const u8,
    ipv4: ?[]const u8,
    ipv6: ?[]const u8,
    is_up: bool,
    is_loopback: bool,

    pub fn deinit(self: *NetworkInterface, allocator: mem.Allocator) void {
        allocator.free(self.name);
        if (self.mac_address) |mac| {
            allocator.free(mac);
        }
        if (self.ipv4) |ip| {
            allocator.free(ip);
        }
        if (self.ipv6) |ip| {
            allocator.free(ip);
        }
    }
};

pub fn getNetworkInterfaces(allocator: mem.Allocator) SystemInfoError![]NetworkInterface {
    // Simplified implementation
    // Full implementation would use getifaddrs on Unix or GetAdaptersAddresses on Windows
    _ = allocator;
    return &.{};
}

pub fn getDefaultGateway(allocator: mem.Allocator) SystemInfoError!?[]const u8 {
    switch (builtin.os.tag) {
        .linux => {
            const content = fs.cwd().openFile("/proc/net/route", .{}) catch return null;
            defer content.close();

            var reader = content.reader();
            var buf: [4096]u8 = undefined;
            const text = reader.readAll(&buf) catch return null;

            var lines = mem.tokenizeScalar(u8, text[0..buf.len], '\n');
            _ = lines.next(); // Skip header

            while (lines.next()) |line| {
                var parts = mem.tokenizeScalar(u8, line, '\t');
                const iface = parts.next() orelse continue;
                const dest = parts.next() orelse continue;
                const gateway = parts.next() orelse continue;

                // Default route has destination 00000000
                if (mem.eql(u8, dest, "00000000")) {
                    // Parse gateway IP (little-endian hex)
                    if (gateway.len == 8) {
                        var ip_buf: [16]u8 = undefined;
                        const len = std.fmt.bufPrint(&ip_buf, "{d}.{d}.{d}.{d}", .{
                            std.fmt.parseInt(u8, gateway[6..8], 16) catch continue,
                            std.fmt.parseInt(u8, gateway[4..6], 16) catch continue,
                            std.fmt.parseInt(u8, gateway[2..4], 16) catch continue,
                            std.fmt.parseInt(u8, gateway[0..2], 16) catch continue,
                        }) catch continue;
                        return allocator.dupe(u8, ip_buf[0..len.len]);
                    }
                }
                _ = iface;
            }
        },
        else => {},
    }
    return null;
}

// ============================================================================
// Battery Information
// ============================================================================

pub const BatteryStatus = enum {
    charging,
    discharging,
    full,
    unknown,
};

pub const BatteryInfo = struct {
    status: BatteryStatus,
    percent: f64,
    time_to_empty_min: ?u32,
    time_to_full_min: ?u32,
    voltage: ?f64,

    pub fn hasPower(self: *const BatteryInfo) bool {
        return self.status != .discharging or self.percent > 0;
    }
};

pub fn getBatteryInfo() SystemInfoError!?BatteryInfo {
    switch (builtin.os.tag) {
        .linux => {
            // Check for ACPI battery
            const bat_path = "/sys/class/power_supply/BAT0";
            const capacity_file = bat_path ++ "/capacity";
            const status_file = bat_path ++ "/status";

            const capacity = fs.cwd().openFile(capacity_file, .{}) catch return null;
            defer capacity.close();

            var reader = capacity.reader();
            var buf: [16]u8 = undefined;
            const text = reader.readAll(&buf) catch return null;
            const percent = std.fmt.parseInt(u8, mem.trim(u8, text[0..buf.len], " \n\r"), 10) catch return null;

            const status_file_handle = fs.cwd().openFile(status_file, .{}) catch {
                return BatteryInfo{
                    .status = .unknown,
                    .percent = @floatFromInt(percent),
                    .time_to_empty_min = null,
                    .time_to_full_min = null,
                    .voltage = null,
                };
            };
            defer status_file_handle.close();

            var status_buf: [32]u8 = undefined;
            const status_text = status_file_handle.reader().readAll(&status_buf) catch "unknown";
            const status_str = mem.trim(u8, status_text[0..status_buf.len], " \n\r");

            const status = if (mem.eql(u8, status_str, "Charging"))
                BatteryStatus.charging
            else if (mem.eql(u8, status_str, "Discharging"))
                BatteryStatus.discharging
            else if (mem.eql(u8, status_str, "Full"))
                BatteryStatus.full
            else
                BatteryStatus.unknown;

            return BatteryInfo{
                .status = status,
                .percent = @floatFromInt(percent),
                .time_to_empty_min = null,
                .time_to_full_min = null,
                .voltage = null,
            };
        },
        .macos => {
            // Would use IOKit
            return null;
        },
        .windows => {
            // Would use GetSystemPowerStatusEx
            return null;
        },
        else => return null,
    }
}

// ============================================================================
// System Uptime
// ============================================================================

pub fn getUptimeSeconds() i64 {
    switch (builtin.os.tag) {
        .linux => {
            const content = fs.cwd().openFile("/proc/uptime", .{}) catch return 0;
            defer content.close();

            var reader = content.reader();
            var buf: [64]u8 = undefined;
            const text = reader.readAll(&buf) catch return 0;

            var parts = mem.tokenizeScalar(u8, text[0..buf.len], ' ');
            if (parts.next()) |uptime_str| {
                const uptime = std.fmt.parseFloat(f64, uptime_str) catch return 0;
                return @intFromFloat(uptime);
            }
        },
        .macos => {
            const result = std.process.Child.run(.{
                .allocator = std.heap.page_allocator,
                .argv = &.{ "sysctl", "-n", "kern.boottime" },
                .stdout_behavior = .Pipe,
            }) catch return 0;

            if (result.term_status == .Exited and result.Exited == 0) {
                // Parse boottime output
                return 0; // Simplified
            }
        },
        else => {},
    }
    return 0;
}

// ============================================================================
// Tests
// ============================================================================

const testing = std.testing;

test "SystemInfo - OS Type" {
    const os_type = getOsType();
    try testing.expect(os_type != .unknown);
}

test "SystemInfo - OS Info" {
    const info = try getOsInfo(testing.allocator);
    defer info.deinit(testing.allocator);

    try testing.expect(info.os_type != .unknown);
    try testing.expect(info.arch.len > 0);
}

test "SystemInfo - CPU Info" {
    const info = try getCpuInfo(testing.allocator);
    defer info.deinit(testing.allocator);

    try testing.expect(info.cores > 0);
    try testing.expect(info.threads > 0);
}

test "SystemInfo - Memory Info" {
    const info = try getMemoryInfo();
    try testing.expect(info.total_bytes > 0);
}

test "SystemInfo - Disk Info" {
    const info = try getDiskInfo(testing.allocator, "/");
    defer info.deinit(testing.allocator);

    try testing.expect(info.total_bytes > 0);
}

test "SystemInfo - Uptime" {
    const uptime = getUptimeSeconds();
    try testing.expect(uptime >= 0);
}

test "SystemInfo - Battery (may be null)" {
    const battery = try getBatteryInfo();
    if (battery) |b| {
        try testing.expect(b.percent >= 0 and b.percent <= 100);
    }
}
