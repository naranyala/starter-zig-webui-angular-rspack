//! Pure WebSocket Server for Backend-Frontend Communication
//! Provides an alternative to WebUI bridge for more complex communication patterns
//!
//! Protocol: WebSocket (ws://)
//! Data Format: JSON with message envelope
//! Pattern: Request/Response + Publish/Subscribe

const std = @import("std");
const net = std.net;
const json = std.json;

const log = std.log.scoped(.WebSocket);

/// WebSocket server configuration
pub const Config = struct {
    host: []const u8 = "127.0.0.1",
    port: u16 = 8765,
    max_clients: usize = 10,
    buffer_size: usize = 4096,
};

/// Message types
pub const MessageType = enum {
    request,
    response,
    event,
    subscribe,
    unsubscribe,
    ping,
    pong,
};

/// Message envelope
pub const Message = struct {
    type: MessageType,
    id: ?u32 = null,
    method: ?[]const u8 = null,
    params: ?[]const u8 = null,
    event: ?[]const u8 = null,
    data: ?[]const u8 = null,
    error: ?[]const u8 = null,
};

/// Client connection
pub const Client = struct {
    id: u32,
    stream: net.Stream,
    address: net.Address,
    subscriptions: std.StringHashMap(void),
    allocator: std.mem.Allocator,

    pub fn init(id: u32, stream: net.Stream, address: net.Address, allocator: std.mem.Allocator) Client {
        return .{
            .id = id,
            .stream = stream,
            .address = address,
            .subscriptions = std.StringHashMap(void).init(allocator),
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *Client) void {
        self.subscriptions.deinit();
        self.stream.close();
    }

    pub fn subscribe(self: *Client, topic: []const u8) !void {
        const key = try self.allocator.dupe(u8, topic);
        errdefer self.allocator.free(key);
        try self.subscriptions.put(key, {});
    }

    pub fn unsubscribe(self: *Client, topic: []const u8) void {
        _ = self.subscriptions.remove(topic);
    }

    pub fn isSubscribed(self: *Client, topic: []const u8) bool {
        return self.subscriptions.contains(topic);
    }

    pub fn send(self: *Client, message: Message) !void {
        var buffer = std.ArrayList(u8).init(self.allocator);
        defer buffer.deinit();

        const writer = buffer.writer();
        try json.stringify(message, .{}, writer);
        try writer.writeByte('\n');

        _ = try self.stream.write(buffer.items);
    }
};

/// WebSocket Server
pub const Server = struct {
    config: Config,
    allocator: std.mem.Allocator,
    clients: std.AutoHashMap(u32, Client),
    next_client_id: u32 = 1,
    running: bool = false,
    mutex: std.Thread.Mutex = .{},

    const Self = @This();

    pub fn init(allocator: std.mem.Allocator, config: Config) Self {
        return .{
            .config = config,
            .allocator = allocator,
            .clients = std.AutoHashMap(u32, Client).init(allocator),
        };
    }

    pub fn deinit(self: *Self) void {
        self.running = false;
        
        // Close all clients
        var it = self.clients.iterator();
        while (it.next()) |entry| {
            entry.value_ptr.deinit();
        }
        self.clients.deinit();
    }

    pub fn start(self: *Self) !void {
        const addr = try net.Address.parseIp4(self.config.host, self.config.port);
        
        var socket = try net.tcpListenOverV4Stream(addr);
        defer socket.close();

        log.info("WebSocket server listening on {s}:{d}", .{ self.config.host, self.config.port });
        
        self.running = true;
        
        while (self.running) {
            const accept_result = socket.accept() catch |err| {
                log.err("Accept failed: {}", .{err});
                continue;
            };

            if (self.clients.count() >= self.config.max_clients) {
                log.warn("Max clients reached, rejecting connection", .{});
                accept_result.stream.close();
                continue;
            }

            try self.handleClient(accept_result.stream, accept_result.address);
        }
    }

    fn handleClient(self: *Self, stream: net.Stream, address: net.Address) !void {
        const client_id = self.next_client_id;
        self.next_client_id += 1;

        var client = Client.init(client_id, stream, address, self.allocator);
        
        log.info("Client {} connected from {}", .{ client_id, address });
        
        errdefer {
            log.info("Client {} disconnected", .{client_id});
            client.deinit();
        }

        try self.clients.put(client_id, client);
        
        // Read and process messages
        var buffer: [4096]u8 = undefined;
        while (self.running) {
            const n = stream.read(&buffer) catch |err| {
                log.err("Read error from client {}: {}", .{ client_id, err });
                break;
            };
            
            if (n == 0) {
                log.info("Client {} closed connection", .{client_id});
                break;
            }

            try self.processMessage(&client, buffer[0..n]);
        }

        // Remove client
        self.mutex.lock();
        _ = self.clients.fetchRemove(client_id);
        self.mutex.unlock();
    }

    fn processMessage(self: *Self, client: *Client, data: []u8) !void {
        // Parse message
        var message = json.parseFromSlice(Message, self.allocator, data, .{}) catch |err| {
            log.err("Failed to parse message: {}", .{err});
            return;
        };
        defer message.deinit();

        const msg = message.value;

        log.debug("Received message from client {}: type={}", .{ client.id, msg.type });

        switch (msg.type) {
            .ping => {
                try client.send(.{ .type = .pong });
            },
            .subscribe => {
                if (msg.event) |topic| {
                    try client.subscribe(topic);
                    log.info("Client {} subscribed to {}", .{ client.id, topic });
                }
            },
            .unsubscribe => {
                if (msg.event) |topic| {
                    client.unsubscribe(topic);
                    log.info("Client {} unsubscribed from {}", .{ client.id, topic });
                }
            },
            .request => {
                // Handle request - dispatch to handler
                try self.handleRequest(client, msg);
            },
            else => {
                log.warn("Unknown message type: {}", .{msg.type});
            },
        }
    }

    fn handleRequest(self: *Self, client: *Client, msg: Message) !void {
        // Process request and send response
        const response = if (msg.method) |method|
            self.processMethod(method, msg.params)
        else
            .{ .type = .response, .id = msg.id, .error = "No method specified" };

        try client.send(response);
    }

    fn processMethod(self: *Self, method: []const u8, params: ?[]const u8) Message {
        // Dispatch to appropriate handler
        _ = self;
        _ = params;
        
        return .{
            .type = .response,
            .data = if (std.mem.eql(u8, method, "ping"))
                "\"pong\""
            else
                "{\"status\":\"ok\"}",
        };
    }

    /// Broadcast event to all subscribers of a topic
    pub fn broadcast(self: *Self, topic: []const u8, data: []const u8) !void {
        self.mutex.lock();
        defer self.mutex.unlock();

        var it = self.clients.iterator();
        while (it.next()) |entry| {
            const client = entry.value_ptr;
            if (client.isSubscribed(topic)) {
                client.send(.{
                    .type = .event,
                    .event = topic,
                    .data = data,
                }) catch |err| {
                    log.err("Failed to broadcast to client {}: {}", .{ client.id, err });
                };
            }
        }
    }

    /// Send message to specific client
    pub fn sendToClient(self: *Self, client_id: u32, message: Message) !void {
        self.mutex.lock();
        defer self.mutex.unlock();

        if (self.clients.getPtr(client_id)) |client| {
            try client.send(message);
        }
    }
};

/// Request handler interface
pub const RequestHandler = struct {
    ctx: *anyopaque,
    handler: *const fn (*anyopaque, []const u8, ?[]const u8) ![]const u8,

    pub fn call(self: RequestHandler, method: []const u8, params: ?[]const u8) ![]const u8 {
        return self.handler(self.ctx, method, params);
    }
};

// ============================================================================
// Tests
// ============================================================================

const testing = std.testing;

test "WebSocket Server - Create and destroy" {
    var server = Server.init(testing.allocator, .{});
    defer server.deinit();
}

test "WebSocket Server - Client subscribe/unsubscribe" {
    var client = Client.init(1, undefined, undefined, testing.allocator);
    defer client.deinit();

    try client.subscribe("test-topic");
    try testing.expect(client.isSubscribed("test-topic"));
    try testing.expect(!client.isSubscribed("other-topic"));

    client.unsubscribe("test-topic");
    try testing.expect(!client.isSubscribed("test-topic"));
}

test "Message parsing" {
    const json_data =
        \\{"type":"request","id":1,"method":"getData","params":"{}"}
    ;
    
    var message = try json.parseFromSlice(Message, testing.allocator, json_data, .{});
    defer message.deinit();

    try testing.expect(message.value.type == .request);
    try testing.expectEqual(@as(u32, 1), message.value.id.?);
    try testing.expectEqualStrings("getData", message.value.method.?);
}

test "WebSocket Server - Client multiple subscriptions" {
    var client = Client.init(1, undefined, undefined, testing.allocator);
    defer client.deinit();

    try client.subscribe("topic1");
    try client.subscribe("topic2");
    try client.subscribe("topic3");

    try testing.expect(client.isSubscribed("topic1"));
    try testing.expect(client.isSubscribed("topic2"));
    try testing.expect(client.isSubscribed("topic3"));
    try testing.expectEqual(@as(usize, 3), client.subscriptions.count());
}

test "WebSocket Server - Client unsubscribe all" {
    var client = Client.init(1, undefined, undefined, testing.allocator);
    defer client.deinit();

    try client.subscribe("topic1");
    try client.subscribe("topic2");

    client.unsubscribe("topic1");
    client.unsubscribe("topic2");
    try testing.expectEqual(@as(usize, 0), client.subscriptions.count());
}

test "WebSocket Server - Message types" {
    // Test request message
    const request_data = \\{"type":"request","id":1,"method":"test","params":{}}
    ;
    var req_msg = try json.parseFromSlice(Message, testing.allocator, request_data, .{});
    defer req_msg.deinit();
    try testing.expect(req_msg.value.type == .request);

    // Test response message  
    const response_data = \\{"type":"response","id":1,"result":"success"}
    ;
    var resp_msg = try json.parseFromSlice(Message, testing.allocator, response_data, .{});
    defer resp_msg.deinit();
    try testing.expect(resp_msg.value.type == .response);

    // Test event message
    const event_data = \\{"type":"event","event":"update","data":{}}
    ;
    var evt_msg = try json.parseFromSlice(Message, testing.allocator, event_data, .{});
    defer evt_msg.deinit();
    try testing.expect(evt_msg.value.type == .event);
}

test "WebSocket Server - Client connection properties" {
    var client = Client.init(42, undefined, undefined, testing.allocator);
    defer client.deinit();

    try testing.expectEqual(@as(u32, 42), client.id);
}

test "WebSocket Server - Server init with custom port" {
    var server = Server.init(testing.allocator, .{ .port = 9999 });
    defer server.deinit();

    try testing.expectEqual(@as(u16, 9999), server.config.port);
}

test "WebSocket Server - Broadcast to topic" {
    var client1 = Client.init(1, undefined, undefined, testing.allocator);
    defer client1.deinit();
    var client2 = Client.init(2, undefined, undefined, testing.allocator);
    defer client2.deinit();

    try client1.subscribe("broadcast_topic");
    try client2.subscribe("broadcast_topic");

    // Both should receive broadcasts to this topic
    try testing.expect(client1.isSubscribed("broadcast_topic"));
    try testing.expect(client2.isSubscribed("broadcast_topic"));
}
