/**
 * gRPC Service Wrapper
 * 
 * Common gRPC server wrapper for all ThreadedServices.
 * Handles gRPC server setup, request routing, and response handling.
 */

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { ThreadedService } from './ThreadedService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROTO_PATH = join(__dirname, '../../../proto/services.proto');

/**
 * Load proto definition
 */
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});

const servicesProto = grpc.loadPackageDefinition(packageDefinition) as any;
const serviceProto = servicesProto.services.Service;

/**
 * Create gRPC server for a ThreadedService
 */
export function createGrpcServer(service: ThreadedService, port: number): grpc.Server {
  const server = new grpc.Server();

  // Add service implementation
  server.addService(serviceProto.service, {
    Call: async (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) => {
      try {
        const request = call.request;
        const method = request.method;
        const args = request.args_json ? JSON.parse(request.args_json) : {};

        // Special handling for healthcheck
        let result;
        if (method === "healthcheck") {
          result = await service.healthcheck();
        } else {
          // Call service's onMessage method
          result = await service.onMessage({ method, args });
        }

        // Return success response
        callback(null, {
          success: true,
          data_json: JSON.stringify(result),
          error: ''
        });
      } catch (err) {
        // Return error response
        callback(null, {
          success: false,
          data_json: '',
          error: err instanceof Error ? err.message : String(err)
        });
      }
    },

    StreamCall: (call: grpc.ServerWritableStream<any, any>) => {
      // Server streaming - for future use
      // Currently not implemented, but structure is ready
      call.end();
    }
  });

  // Bind server to port
  const address = `0.0.0.0:${port}`;
  server.bindAsync(
    address,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        console.error(`gRPC Server [${service.id}]: Failed to bind to ${address}`, err);
        return;
      }
      // server.start() is no longer necessary - bindAsync automatically starts the server
      console.log(`gRPC Server [${service.id}]: Listening on port ${port}`);
    }
  );

  return server;
}

/**
 * Create gRPC client for a service
 */
export function createGrpcClient(serviceId: string, port: number): any {
  const address = `localhost:${port}`;
  const client = new serviceProto(
    address,
    grpc.credentials.createInsecure()
  );

  return {
    call: (method: string, args: any): Promise<any> => {
      return new Promise((resolve, reject) => {
        client.Call(
          {
            method,
            args_json: JSON.stringify(args)
          },
          (err: grpc.ServiceError | null, response: any) => {
            if (err) {
              reject(err);
              return;
            }

            if (!response.success) {
              reject(new Error(response.error || 'Service call failed'));
              return;
            }

            try {
              const data = response.data_json ? JSON.parse(response.data_json) : null;
              resolve(data);
            } catch (parseErr) {
              reject(new Error('Failed to parse response'));
            }
          }
        );
      });
    }
  };
}

