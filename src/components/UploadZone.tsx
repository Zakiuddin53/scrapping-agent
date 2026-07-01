"use client";

import { useState, useRef } from "react";
import { Dropzone, PDF_MIME_TYPE, FileWithPath } from "@mantine/dropzone";
import { Group, Text, rem, Button, Alert } from "@mantine/core";
import { IconUpload, IconX, IconAlertCircle } from "@tabler/icons-react";

interface UploadZoneProps {
  onFileSelected: (file: File) => void;
}

export function UploadZone({ onFileSelected }: UploadZoneProps) {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const openRef = useRef<() => void>(null);

  const handleDrop = (files: FileWithPath[]) => {
    setErrorMsg(null);
    if (files.length > 0) {
      onFileSelected(files[0]);
    }
  };

  const handleReject = (fileRejections: any[]) => {
    const rejection = fileRejections[0];
    if (rejection.errors[0]?.code === 'file-invalid-type') {
      setErrorMsg("Only PDF files are supported. Please upload a valid PDF.");
    } else if (rejection.errors[0]?.code === 'file-too-large') {
      setErrorMsg("File is too large. Maximum size is 10 MB.");
    } else {
      setErrorMsg("Unable to process the selected file.");
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      {errorMsg && (
        <Alert 
          icon={<IconAlertCircle size={16} />} 
          title="Upload Error" 
          color="red" 
          mb="md" 
          variant="light" 
          onClose={() => setErrorMsg(null)} 
          withCloseButton
        >
          {errorMsg}
        </Alert>
      )}

      <Dropzone
        openRef={openRef}
        onDrop={handleDrop}
        onReject={handleReject}
        maxSize={10 * 1024 ** 2}
        accept={PDF_MIME_TYPE}
        multiple={false}
        className="border-dashed border-2 border-gray-300 hover:border-blue-500 transition-colors duration-200 ease-in-out"
      >
        <Group justify="center" gap="xl" mih={220} style={{ pointerEvents: 'none' }}>
          <Dropzone.Accept>
            <IconUpload
              style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-blue-6)' }}
              stroke={1.5}
            />
          </Dropzone.Accept>
          <Dropzone.Reject>
            <IconX
              style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-red-6)' }}
              stroke={1.5}
            />
          </Dropzone.Reject>
          <Dropzone.Idle>
            <IconX
              style={{ width: rem(52), height: rem(52), color: 'var(--mantine-color-dimmed)' }}
              stroke={1.5}
            />
          </Dropzone.Idle>

          <div className="text-center">
            <Text size="xl" inline>
              Drag PDF here
            </Text>
            <Text size="sm" c="dimmed" inline mt={7}>
              Attach a single PDF file (EOB/ERA) — max 10MB
            </Text>
          </div>
        </Group>
      </Dropzone>
      
      <div className="flex flex-col items-center justify-center mt-6 gap-2">
          <Text size="sm" c="dimmed">
             or
          </Text>
          <Button onClick={() => openRef.current?.()} variant="outline" color="gray" size="md">
            Browse File
          </Button>
      </div>
    </div>
  );
}
