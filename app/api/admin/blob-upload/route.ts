import { NextRequest, NextResponse } from 'next/server';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { isAdminAuthenticated } from '@/lib/auth';
import { isValidType, TYPE_CONFIGS, type ContentType } from '@/lib/validation';

// POST /api/admin/blob-upload
// Browser token requests require an admin session. Vercel completion callbacks
// instead authenticate through the signature verified by handleUpload.
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;

    if (!body || !['blob.generate-client-token', 'blob.upload-completed'].includes(body.type)) {
      return NextResponse.json({ error: 'Invalid upload request.' }, { status: 400 });
    }
    if (body.type === 'blob.generate-client-token' && !(await isAdminAuthenticated(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        if (!(await isAdminAuthenticated(request))) {
          throw new Error('Unauthorized');
        }

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
