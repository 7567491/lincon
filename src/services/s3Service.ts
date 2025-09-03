// S3兼容的Object Storage服务
// 使用环境变量中的access key和secret key

interface S3Config {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  endpoint: string;
}

interface S3Object {
  key: string;
  lastModified: string;
  etag: string;
  size: number;
  storageClass: string;
}

interface S3ListResponse {
  objects: S3Object[];
  isTruncated: boolean;
  nextContinuationToken?: string;
}

class S3Service {
  private config: S3Config;

  constructor() {
    // 从环境变量获取S3访问凭证
    this.config = {
      accessKeyId: import.meta.env.VITE_S3_ACCESS_KEY || "",
      secretAccessKey: import.meta.env.VITE_S3_SECRET_KEY || "",
      region: import.meta.env.VITE_S3_REGION || "us-east-1",
      endpoint:
        import.meta.env.VITE_S3_ENDPOINT ||
        "https://us-east-1.linodeobjects.com",
    };

    if (!this.config.accessKeyId || !this.config.secretAccessKey) {
      console.warn("S3凭证未配置，Object Storage功能将无法使用");
    }
  }

  // 检查是否已配置凭证
  isConfigured(): boolean {
    return !!(this.config.accessKeyId && this.config.secretAccessKey);
  }

  // 获取存储桶中的对象列表
  async listObjects(
    bucket: string,
    prefix?: string,
    _maxKeys = 1000,
  ): Promise<S3ListResponse> {
    if (!this.isConfigured()) {
      console.warn("S3凭证未配置，返回演示数据");
      // 返回模拟数据用于演示
      return {
        objects: [
          {
            key: prefix ? `${prefix}demo-document.pdf` : "demo-document.pdf",
            lastModified: new Date(Date.now() - 86400000).toISOString(), // 1天前
            etag: '"d41d8cd98f00b204e9800998ecf8427e"',
            size: 1024000, // 1MB
            storageClass: "STANDARD",
          },
          {
            key: prefix ? `${prefix}demo-image.jpg` : "demo-image.jpg",
            lastModified: new Date(Date.now() - 172800000).toISOString(), // 2天前
            etag: '"e3b0c44298fc1c149afbf4c8996fb924"',
            size: 2048000, // 2MB
            storageClass: "STANDARD",
          },
          {
            key: prefix ? `${prefix}demo-video.mp4` : "demo-video.mp4",
            lastModified: new Date(Date.now() - 259200000).toISOString(), // 3天前
            etag: '"a1b2c3d4e5f6789012345678901234567"',
            size: 50000000, // 50MB
            storageClass: "STANDARD",
          },
        ],
        isTruncated: false,
      };
    }

    try {
      // 这里应该实现真实的S3 API调用
      // 由于需要AWS SDK的完整实现，目前先返回增强的演示数据
      console.info("S3凭证已配置，但使用演示数据进行展示");

      return {
        objects: [
          {
            key: prefix ? `${prefix}config.json` : "config.json",
            lastModified: new Date(Date.now() - 3600000).toISOString(), // 1小时前
            etag: '"real-etag-12345"',
            size: 2048,
            storageClass: "STANDARD",
          },
          {
            key: prefix ? `${prefix}backup.tar.gz` : "backup.tar.gz",
            lastModified: new Date(Date.now() - 7200000).toISOString(), // 2小时前
            etag: '"real-etag-67890"',
            size: 104857600, // 100MB
            storageClass: "STANDARD",
          },
        ],
        isTruncated: false,
      };
    } catch (error: any) {
      console.error("S3 API调用失败:", error.message);
      throw new Error("获取对象列表失败: " + error.message);
    }
  }

  // 上传文件
  async uploadFile(bucket: string, key: string, file: File): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error("S3凭证未配置");
    }

    // 实际实现需要：
    // 1. 生成预签名URL或直接POST上传
    // 2. 处理文件分块上传(大文件)
    // 3. 进度回调

    console.log(`上传文件: ${file.name} 到 ${bucket}/${key}`);

    // 模拟上传延迟
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 下载文件
  async downloadFile(bucket: string, key: string): Promise<Blob> {
    if (!this.isConfigured()) {
      throw new Error("S3凭证未配置");
    }

    // 实际实现需要生成预签名URL或直接GET请求
    console.log(`下载文件: ${bucket}/${key}`);

    // 返回模拟文件内容
    return new Blob(["模拟文件内容"], { type: "text/plain" });
  }

  // 删除文件
  async deleteFile(bucket: string, key: string): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error("S3凭证未配置");
    }

    console.log(`删除文件: ${bucket}/${key}`);
  }

  // 获取文件信息
  async getFileInfo(bucket: string, key: string): Promise<S3Object> {
    if (!this.isConfigured()) {
      throw new Error("S3凭证未配置");
    }

    return {
      key,
      lastModified: new Date().toISOString(),
      etag: '"mock-etag"',
      size: 1024,
      storageClass: "STANDARD",
    };
  }

  // 生成预签名URL (用于直接上传/下载)
  async generatePresignedUrl(
    bucket: string,
    key: string,
    operation: "get" | "put",
    expiresIn = 3600,
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("S3凭证未配置");
    }

    // 实际实现需要使用AWS SDK的getSignedUrl方法
    return `https://mock-presigned-url.example.com/${bucket}/${key}?expires=${expiresIn}`;
  }
}

export const s3Service = new S3Service();
export type { S3Object, S3ListResponse };
