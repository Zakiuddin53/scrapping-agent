"use client";

import { useState } from "react";
import { UploadZone } from "@/components/UploadZone";
import { Container, Title, Text, Button, Paper, Group, Alert } from "@mantine/core";
import { IconFileCheck, IconArrowRight, IconX } from "@tabler/icons-react";

type UIState = 'idle' | 'file_selected' | 'error';

export default function Home() {
  const [uiState, setUiState] = useState<UIState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelected = (file: File) => {
    setSelectedFile(file);
    setUiState('file_selected');
  };

  const resetState = () => {
    setSelectedFile(null);
    setUiState('idle');
  };

  return (
    <Container size="md" py="xl">
      <div className="text-center mb-10">
        <Title order={1} className="mb-2">AI Payment Posting Assistant</Title>
        <Text c="dimmed">Upload an Explanation of Benefits (EOB) or ERA PDF to automatically extract payment details.</Text>
      </div>

      {uiState === 'idle' && (
        <UploadZone onFileSelected={handleFileSelected} />
      )}

      {uiState === 'file_selected' && selectedFile && (
        <Paper withBorder shadow="sm" p="xl" radius="md" className="max-w-2xl mx-auto mt-8">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="bg-blue-50 text-blue-600 p-4 rounded-full mb-4">
              <IconFileCheck size={48} />
            </div>
            <Title order={3} mb="xs">Ready to process</Title>
            <Text c="dimmed" mb="xl">
              Selected file: <span className="font-medium text-gray-700">{selectedFile.name}</span> ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </Text>
            
            <Group>
              <Button variant="default" onClick={resetState} leftSection={<IconX size={16} />}>
                Cancel
              </Button>
              <Button rightSection={<IconArrowRight size={16} />} color="blue">
                Process Document
              </Button>
            </Group>
          </div>
        </Paper>
      )}

      {uiState === 'error' && (
        <div className="max-w-2xl mx-auto mt-8">
          <Alert color="red" title="An error occurred" withCloseButton onClose={resetState}>
            Something went wrong while processing the file.
          </Alert>
          <Button mt="md" variant="outline" onClick={resetState}>Try Again</Button>
        </div>
      )}
    </Container>
  );
}
