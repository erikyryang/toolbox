"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { backendAvailable, compressOnServer, extractOnServer, inspectOnServer } from "@/lib/compression/backend";
import { CompressionClient } from "@/lib/compression/client";
import { FileOperationController } from "@/lib/compression/file-controller";

export function useFileOperation() {
  const [controller] = useState(() => new FileOperationController({
    createClient: () => new CompressionClient(),
    backendAvailable,
    compressOnServer,
    inspectOnServer,
    extractOnServer,
  }));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  useEffect(() => () => controller.dispose(), [controller]);
  return { ...state, controller };
}
