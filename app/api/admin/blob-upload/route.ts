import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { isValidType, TYPE_CONFIGS, type ContentType } from '@/lib/validation';

// POST /api/admin/blob-upload
// Issues a client upload token after verifying auth (done by middleware)
// and enforcing per-type file constraints.
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        // Parse the content type from the client payload
        let contentType: ContentType = 'blog';
        if (clientPayload) {
          try {
            const parsed = JSON.parse(clientPayload);
            if (parsed.type && isValidType(parsed.type)) {
              contentType = parsed.type;
            }
          } catch {
            // Use default
          }
        }

        const config = TYPE_CONFIGS[contentType];

        return {
          allowedContentTypes: config.allowedMimes,
          maximumSizeInBytes: config.maxFileSizeBytes,
          tokenPayload: JSON.stringify({ type: contentType }),
        };
      },
      onUploadCompleted: async () => {
        // No-op. Content creation is handled by the content route after
        // the client receives the blob URL. This callback is unreliable
        // in local development.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload token generation failed.';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
