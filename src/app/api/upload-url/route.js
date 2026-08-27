import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.S3_UPLOAD_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_UPLOAD_AWS_SECRET_ACCESS_KEY,
  },
});

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("file");
    const fileType = searchParams.get("fileType");

    if (!fileName || !fileType) {
      return NextResponse.json({ error: "Missing file name or type" }, { status: 400 });
    }

    const uniqueFileName = `public/products/${Date.now()}-${fileName.replace(/\s+/g, '-')}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: uniqueFileName,
      ContentType: fileType,
    });

    // Generate URL valid for 5 minutes
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    const fileUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || "ap-south-1"}.amazonaws.com/${uniqueFileName}`;

    return NextResponse.json({ uploadUrl, fileUrl });
  } catch (error) {
    console.error("Error generating presigned URL", error);
    return NextResponse.json({ error: "Failed to generate URL" }, { status: 500 });
  }
}
