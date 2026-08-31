/**
 * gRPC Client Factory & Inter-Service Stubs
 * Provides typed gRPC client channels to microservices with graceful local fallback.
 */

export interface GrpcServiceConfig {
  host: string;
  port: number;
  protoPath?: string;
  package?: string;
}

export const GRPC_PORTS = {
  AUTH: Number(process.env.GRPC_AUTH_PORT || 50051),
  MEDIA: Number(process.env.GRPC_MEDIA_PORT || 50052),
  MATCH: Number(process.env.GRPC_MATCH_PORT || 50053),
  CHAT: Number(process.env.GRPC_CHAT_PORT || 50054),
  DISCOVERY: Number(process.env.GRPC_DISCOVERY_PORT || 50055),
};

export class GrpcClientFactory {
  static getServiceEndpoint(serviceName: keyof typeof GRPC_PORTS): string {
    const host = process.env[`GRPC_${serviceName}_HOST`] || 'localhost';
    const port = GRPC_PORTS[serviceName];
    return `${host}:${port}`;
  }
}
