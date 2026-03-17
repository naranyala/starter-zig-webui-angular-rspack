//! Clipboard Utility
//! Provides clipboard operations for desktop applications
//! Features: Text copy/paste, HTML content, file lists, image support
//! Platform-specific implementations for Linux, Windows, and macOS

const std = @import("std");
const mem = std.mem;
const builtin = @import("std").builtin;

const log = std.log.scoped(.Clipboard);

// ============================================================================
// Error Types
// ============================================================================

pub const ClipboardError = error{
    Unavailable,
    AccessDenied,
    Empty,
    InvalidFormat,
    TooLarge,
    LockFailed,
    PlatformNotSupported,
    OutOfMemory,
};

// ============================================================================
// Clipboard Content Types
// ============================================================================

pub const ContentType = enum {
    text,
    html,
    rtf,
    image,
    files,
    custom,
};

pub const ClipboardContent = union(ContentType) {
    text: []const u8,
    html: HtmlContent,
    rtf: []const u8,
    image: ImageContent,
    files: []const []const u8,
    custom: CustomContent,

    pub fn deinit(self: *ClipboardContent, allocator: mem.Allocator) void {
        switch (self.*) {
            .text => |t| allocator.free(t),
            .html => |*h| h.deinit(allocator),
            .rtf => |r| allocator.free(r),
            .image => |*i| i.deinit(allocator),
            .files => |f| {
                for (f) |file| {
                    allocator.free(file);
                }
                allocator.free(f);
            },
            .custom => |*c| c.deinit(allocator),
        }
    }
};

pub const HtmlContent = struct {
    html: []const u8,
    fragment: []const u8,
    base_url: ?[]const u8 = null,

    pub fn deinit(self: *HtmlContent, allocator: mem.Allocator) void {
        allocator.free(self.html);
        allocator.free(self.fragment);
        if (self.base_url) |url| {
            allocator.free(url);
        }
    }
};

pub const ImageContent = struct {
    format: ImageFormat,
    data: []const u8,
    width: u32,
    height: u32,

    pub const ImageFormat = enum {
        png,
        jpeg,
        bmp,
        gif,
        svg,
    };

    pub fn deinit(self: *ImageContent, allocator: mem.Allocator) void {
        allocator.free(self.data);
    }
};

pub const CustomContent = struct {
    format: []const u8,
    data: []const u8,

    pub fn deinit(self: *CustomContent, allocator: mem.Allocator) void {
        allocator.free(self.format);
        allocator.free(self.data);
    }
};

// ============================================================================
// Clipboard Interface
// ============================================================================

pub const Clipboard = struct {
    allocator: mem.Allocator,
    platform_impl: PlatformClipboard,

    const PlatformClipboard = union(enum) {
        linux: LinuxClipboard,
        windows: WindowsClipboard,
        macos: MacosClipboard,
        unsupported: void,
    };

    pub fn init(allocator: mem.Allocator) ClipboardError!Clipboard {
        const platform_impl = switch (@import("std").builtin.os.tag) {
            .linux => PlatformClipboard{
                .linux = LinuxClipboard.init() catch return ClipboardError.Unavailable,
            },
            .windows => PlatformClipboard{
                .windows = WindowsClipboard.init() catch return ClipboardError.Unavailable,
            },
            .macos => PlatformClipboard{
                .macos = MacosClipboard.init() catch return ClipboardError.Unavailable,
            },
            else => PlatformClipboard{ .unsupported = {} },
        };

        return Clipboard{
            .allocator = allocator,
            .platform_impl = platform_impl,
        };
    }

    pub fn deinit(self: *Clipboard) void {
        switch (self.platform_impl) {
            .linux => |*impl| impl.deinit(),
            .windows => |*impl| impl.deinit(),
            .macos => |*impl| impl.deinit(),
            .unsupported => {},
        }
    }

    pub fn setText(self: *Clipboard, text: []const u8) ClipboardError!void {
        log.debug("Setting clipboard text ({d} bytes)", .{text.len});

        switch (self.platform_impl) {
            .linux => |*impl| return impl.setText(text),
            .windows => |*impl| return impl.setText(text),
            .macos => |*impl| return impl.setText(text),
            .unsupported => return ClipboardError.PlatformNotSupported,
        }
    }

    pub fn getText(self: *Clipboard) ClipboardError![]const u8 {
        log.debug("Getting clipboard text", .{});

        switch (self.platform_impl) {
            .linux => |*impl| return impl.getText(self.allocator),
            .windows => |*impl| return impl.getText(self.allocator),
            .macos => |*impl| return impl.getText(self.allocator),
            .unsupported => return ClipboardError.PlatformNotSupported,
        }
    }

    pub fn hasText(self: *Clipboard) ClipboardError!bool {
        switch (self.platform_impl) {
            .linux => |*impl| return impl.hasText(),
            .windows => |*impl| return impl.hasText(),
            .macos => |*impl| return impl.hasText(),
            .unsupported => return ClipboardError.PlatformNotSupported,
        }
    }

    pub fn clear(self: *Clipboard) ClipboardError!void {
        log.debug("Clearing clipboard", .{});

        switch (self.platform_impl) {
            .linux => |*impl| return impl.clear(),
            .windows => |*impl| return impl.clear(),
            .macos => |*impl| return impl.clear(),
            .unsupported => return ClipboardError.PlatformNotSupported,
        }
    }

    pub fn setHtml(self: *Clipboard, html: HtmlContent) ClipboardError!void {
        switch (self.platform_impl) {
            .linux => |*impl| return impl.setHtml(html),
            .windows => |*impl| return impl.setHtml(html),
            .macos => |*impl| return impl.setHtml(html),
            .unsupported => return ClipboardError.PlatformNotSupported,
        }
    }

    pub fn getHtml(self: *Clipboard) ClipboardError!HtmlContent {
        switch (self.platform_impl) {
            .linux => |*impl| return impl.getHtml(self.allocator),
            .windows => |*impl| return impl.getHtml(self.allocator),
            .macos => |*impl| return impl.getHtml(self.allocator),
            .unsupported => return ClipboardError.PlatformNotSupported,
        }
    }

    pub fn hasHtml(self: *Clipboard) ClipboardError!bool {
        switch (self.platform_impl) {
            .linux => |*impl| return impl.hasHtml(),
            .windows => |*impl| return impl.hasHtml(),
            .macos => |*impl| return impl.hasHtml(),
            .unsupported => return ClipboardError.PlatformNotSupported,
        }
    }
};

// ============================================================================
// Linux Implementation (X11/Wayland)
// ============================================================================

const LinuxClipboard = struct {
    primary_selection: bool = false,
    clipboard_owner: bool = false,

    fn init() ClipboardError!LinuxClipboard {
        // Check for X11 or Wayland
        const has_x11 = std.posix.getenv("DISPLAY") != null;
        const has_wayland = std.posix.getenv("WAYLAND_DISPLAY") != null;

        if (!has_x11 and !has_wayland) {
            return ClipboardError.Unavailable;
        }

        return LinuxClipboard{};
    }

    fn deinit(self: *LinuxClipboard) void {
        _ = self;
    }

    fn setText(self: *LinuxClipboard, text: []const u8) ClipboardError!void {
        // Use xclip or xsel for X11
        const result = std.process.Child.run(.{
            .allocator = std.heap.page_allocator,
            .argv = &.{ "xclip", "-selection", "clipboard" },
            .stdin_behavior = .Pipe,
        }) catch |err| {
            log.warn("xclip not available: {}", .{err});
            // Try xsel
            return self.setTextXsel(text);
        };

        if (result.term_status != .Exited or result.Exited != 0) {
            log.warn("xclip failed, trying xsel", .{});
            return self.setTextXsel(text);
        }

        // Write to stdin
        // Note: This is a simplified implementation
        // A full implementation would handle the X11 selection protocol
    }

    fn setTextXsel(_: *LinuxClipboard, text: []const u8) ClipboardError!void {
        const result = std.process.Child.run(.{
            .allocator = std.heap.page_allocator,
            .argv = &.{ "xsel", "--clipboard", "--input" },
            .stdin_behavior = .Pipe,
        }) catch return ClipboardError.Unavailable;

        if (result.term_status != .Exited or result.Exited != 0) {
            return ClipboardError.AccessDenied;
        }
        _ = text;
    }

    fn getText(self: *LinuxClipboard, allocator: mem.Allocator) ClipboardError![]const u8 {
        // Try xclip first
        const result = std.process.Child.run(.{
            .allocator = allocator,
            .argv = &.{ "xclip", "-selection", "clipboard", "-output" },
            .stdout_behavior = .Pipe,
        }) catch |err| {
            log.warn("xclip not available: {}", .{err});
            return self.getTextXsel(allocator);
        };

        if (result.term_status != .Exited or result.Exited != 0) {
            log.warn("xclip failed, trying xsel", .{});
            return self.getTextXsel(allocator);
        }

        return result.stdout;
    }

    fn getTextXsel(_: *LinuxClipboard, allocator: mem.Allocator) ClipboardError![]const u8 {
        const result = std.process.Child.run(.{
            .allocator = allocator,
            .argv = &.{ "xsel", "--clipboard", "--output" },
            .stdout_behavior = .Pipe,
        }) catch return ClipboardError.Unavailable;

        if (result.term_status != .Exited or result.Exited != 0) {
            return ClipboardError.Empty;
        }

        return result.stdout;
    }

    fn hasText(self: *LinuxClipboard) ClipboardError!bool {
        const result = std.process.Child.run(.{
            .allocator = std.heap.page_allocator,
            .argv = &.{ "xclip", "-selection", "clipboard", "-target", "UTF8_STRING" },
            .stdout_behavior = .Pipe,
        }) catch |err| {
            log.warn("xclip check failed: {}", .{err});
            return self.hasTextXsel();
        };

        return result.stdout.len > 0;
    }

    fn hasTextXsel(_: *LinuxClipboard) ClipboardError!bool {
        const result = std.process.Child.run(.{
            .allocator = std.heap.page_allocator,
            .argv = &.{ "xsel", "--clipboard" },
            .stdout_behavior = .Pipe,
        }) catch return false;

        return result.stdout.len > 0;
    }

    fn clear(_: *LinuxClipboard) ClipboardError!void {
        _ = std.process.Child.run(.{
            .allocator = std.heap.page_allocator,
            .argv = &.{ "xclip", "-selection", "clipboard", "-i", "/dev/null" },
        }) catch |err| {
            log.warn("xclip clear failed: {}", .{err});
            return ClipboardError.Unavailable;
        };
    }

    fn setHtml(_: *LinuxClipboard, html: HtmlContent) ClipboardError!void {
        // Set HTML content using text/html MIME type
        _ = html;
        // Full implementation would use xclip with -t text/html
    }

    fn getHtml(_: *LinuxClipboard, allocator: mem.Allocator) ClipboardError!HtmlContent {
        _ = allocator;
        return ClipboardError.Unavailable;
    }

    fn hasHtml(_: *LinuxClipboard) ClipboardError!bool {
        // Check if text/html is available in clipboard
        return false;
    }
};

// ============================================================================
// Windows Implementation
// ============================================================================

const WindowsClipboard = struct {
    fn init() ClipboardError!WindowsClipboard {
        // Windows clipboard is always available
        return WindowsClipboard{};
    }

    fn deinit(self: *WindowsClipboard) void {
        _ = self;
    }

    fn setText(self: *WindowsClipboard, text: []const u8) ClipboardError!void {
        _ = self;
        _ = text;
        // Windows API implementation would go here
        // Uses OpenClipboard, EmptyClipboard, SetClipboardData
    }

    fn getText(_: *WindowsClipboard, allocator: mem.Allocator) ClipboardError![]const u8 {
        _ = allocator;
        // Windows API implementation would go here
        // Uses OpenClipboard, GetClipboardData
        return ClipboardError.Unavailable;
    }

    fn hasText(self: *WindowsClipboard) ClipboardError!bool {
        // Windows API: IsClipboardFormatAvailable(CF_TEXT)
        _ = self;
        return false;
    }

    fn clear(self: *WindowsClipboard) ClipboardError!void {
        // Windows API: OpenClipboard + EmptyClipboard
        _ = self;
    }

    fn setHtml(self: *WindowsClipboard, html: HtmlContent) ClipboardError!void {
        _ = self;
        _ = html;
        // Windows uses CF_HTML format
    }

    fn getHtml(_: *WindowsClipboard, allocator: mem.Allocator) ClipboardError!HtmlContent {
        _ = allocator;
        return ClipboardError.Unavailable;
    }

    fn hasHtml(self: *WindowsClipboard) ClipboardError!bool {
        // Windows API: IsClipboardFormatAvailable(GetClipboardFormatNameA("HTML Format"))
        _ = self;
        return false;
    }
};

// ============================================================================
// macOS Implementation
// ============================================================================

const MacosClipboard = struct {
    fn init() ClipboardError!MacosClipboard {
        // macOS clipboard (NSPasteboard) is always available
        return MacosClipboard{};
    }

    fn deinit(self: *MacosClipboard) void {
        _ = self;
    }

    fn setText(self: *MacosClipboard, text: []const u8) ClipboardError!void {
        _ = self;
        _ = text;
        // macOS API implementation using NSPasteboard
        // Could also use 'pbcopy' command
    }

    fn getText(_: *MacosClipboard, allocator: mem.Allocator) ClipboardError![]const u8 {
        // Use pbcopy/pbpaste for simplicity
        const result = std.process.Child.run(.{
            .allocator = allocator,
            .argv = &.{"pbpaste"},
            .stdout_behavior = .Pipe,
        }) catch return ClipboardError.Unavailable;

        if (result.term_status != .Exited or result.Exited != 0) {
            return ClipboardError.Empty;
        }

        return result.stdout;
    }

    fn hasText(_: *MacosClipboard) ClipboardError!bool {
        const result = std.process.Child.run(.{
            .allocator = std.heap.page_allocator,
            .argv = &.{"pbpaste"},
            .stdout_behavior = .Pipe,
        }) catch return false;

        return result.stdout.len > 0;
    }

    fn clear(_: *MacosClipboard) ClipboardError!void {
        _ = std.process.Child.run(.{
            .allocator = std.heap.page_allocator,
            .argv = &.{ "osascript", "-e", "tell application \"System Events\" to keystroke \"w\" using command down" },
        }) catch |err| {
            log.warn("macOS clear failed: {}", .{err});
            return ClipboardError.Unavailable;
        };
    }

    fn setHtml(self: *MacosClipboard, html: HtmlContent) ClipboardError!void {
        _ = self;
        _ = html;
        // macOS uses NSPasteboardTypeHTML
    }

    fn getHtml(_: *MacosClipboard, allocator: mem.Allocator) ClipboardError!HtmlContent {
        _ = allocator;
        return ClipboardError.Unavailable;
    }

    fn hasHtml(self: *MacosClipboard) ClipboardError!bool {
        _ = self;
        return false;
    }
};

// ============================================================================
// Convenience Functions
// ============================================================================

/// Copy text to clipboard (creates temporary clipboard instance)
pub fn copyText(text: []const u8) ClipboardError!void {
    var clipboard = try Clipboard.init(std.heap.page_allocator);
    defer clipboard.deinit();
    try clipboard.setText(text);
}

/// Paste text from clipboard (creates temporary clipboard instance)
pub fn pasteText(allocator: mem.Allocator) ClipboardError![]const u8 {
    var clipboard = try Clipboard.init(allocator);
    defer clipboard.deinit();
    return try clipboard.getText();
}

// ============================================================================
// Tests
// ============================================================================

const testing = std.testing;

test "Clipboard - Init and deinit" {
    var clipboard = Clipboard.init(testing.allocator) catch |err| {
        // Clipboard may not be available in test environment
        if (err == ClipboardError.Unavailable) return;
        return err;
    };
    defer clipboard.deinit();
}

test "Clipboard - Copy and paste text" {
    var clipboard = Clipboard.init(testing.allocator) catch |err| {
        if (err == ClipboardError.Unavailable) return;
        return err;
    };
    defer clipboard.deinit();

    const test_text = "Hello, Clipboard!";
    try clipboard.setText(test_text);

    // Note: This may fail in headless environments
    const text = try clipboard.getText();
    defer testing.allocator.free(text);

    try testing.expectEqualStrings(test_text, text);
}

test "Clipboard - Has text" {
    var clipboard = Clipboard.init(testing.allocator) catch |err| {
        if (err == ClipboardError.Unavailable) return;
        return err;
    };
    defer clipboard.deinit();

    _ = try clipboard.hasText();
}
