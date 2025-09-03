import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { linodeAPI } from "@/services/linodeAPI";
import { s3Service } from "@/services/s3Service";
import type {
  ObjectStorageBucket,
  ObjectStorageCluster,
  BucketObject,
} from "@/types";

export const useBucketStore = defineStore("buckets", () => {
  // 状态
  const buckets = ref<ObjectStorageBucket[]>([]);
  const clusters = ref<ObjectStorageCluster[]>([]);
  const bucketObjects = ref<Record<string, BucketObject[]>>({});
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const lastUpdateTime = ref<Date | null>(null);

  // 自动刷新定时器
  const autoRefreshTimer = ref<NodeJS.Timeout | null>(null);
  const isAutoRefreshing = ref(false);

  // 计算属性
  const totalBuckets = computed(() => buckets.value.length);

  const totalObjects = computed(() =>
    buckets.value.reduce((sum, bucket) => sum + bucket.objects, 0),
  );

  const totalSize = computed(() =>
    buckets.value.reduce((sum, bucket) => sum + bucket.size, 0),
  );

  const bucketsByCluster = computed(() => {
    const grouped: Record<string, ObjectStorageBucket[]> = {};
    buckets.value.forEach((bucket) => {
      if (!grouped[bucket.cluster]) {
        grouped[bucket.cluster] = [];
      }
      grouped[bucket.cluster].push(bucket);
    });
    return grouped;
  });

  // 动作
  async function loadBuckets() {
    isLoading.value = true;
    error.value = null;

    try {
      const response = await linodeAPI.getObjectStorageBuckets();
      buckets.value = response.data || [];
      lastUpdateTime.value = new Date();
    } catch (err: any) {
      error.value =
        err.response?.data?.errors?.[0]?.reason || "获取存储桶列表失败";
      console.error("获取存储桶失败:", err);
    } finally {
      isLoading.value = false;
    }
  }

  async function loadClusters() {
    try {
      const response = await linodeAPI.getObjectStorageClusters();
      clusters.value = response.data || [];
    } catch (err: any) {
      console.error("获取存储集群失败:", err);
    }
  }

  async function loadBucketObjects(
    cluster: string,
    bucket: string,
    prefix?: string,
  ) {
    const bucketKey = `${cluster}/${bucket}`;

    try {
      // 如果S3服务已配置，使用S3服务获取对象列表
      if (s3Service.isConfigured()) {
        const response = await s3Service.listObjects(bucket, prefix);

        // 转换S3Object格式到BucketObject格式
        bucketObjects.value[bucketKey] = response.objects.map((obj) => ({
          key: obj.key,
          last_modified: obj.lastModified,
          etag: obj.etag,
          size: obj.size,
          storage_class: obj.storageClass,
        }));
      } else {
        // 否则使用Linode API（可能不支持列出对象）
        const response = await linodeAPI.getBucketObjects(
          cluster,
          bucket,
          prefix,
        );
        bucketObjects.value[bucketKey] = response.data || [];
      }
    } catch (err: any) {
      error.value = err.message || "获取存储桶对象失败";
      console.error("获取存储桶对象失败:", err);
    }
  }

  async function createBucket(cluster: string, label: string) {
    isLoading.value = true;
    error.value = null;

    try {
      await linodeAPI.createBucket(cluster, label);
      await loadBuckets(); // 重新加载列表
    } catch (err: any) {
      error.value = err.response?.data?.errors?.[0]?.reason || "创建存储桶失败";
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteBucket(cluster: string, label: string) {
    isLoading.value = true;
    error.value = null;

    try {
      await linodeAPI.deleteBucket(cluster, label);
      await loadBuckets(); // 重新加载列表
    } catch (err: any) {
      error.value = err.response?.data?.errors?.[0]?.reason || "删除存储桶失败";
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function uploadFile(
    cluster: string,
    bucket: string,
    key: string,
    file: File,
  ) {
    try {
      await s3Service.uploadFile(bucket, key, file);
      // 重新加载存储桶对象列表
      await loadBucketObjects(cluster, bucket);
    } catch (err: any) {
      error.value = err.message || "文件上传失败";
      throw err;
    }
  }

  async function downloadFile(cluster: string, bucket: string, key: string) {
    try {
      return await s3Service.downloadFile(bucket, key);
    } catch (err: any) {
      error.value = err.message || "文件下载失败";
      throw err;
    }
  }

  async function deleteFile(cluster: string, bucket: string, key: string) {
    try {
      await s3Service.deleteFile(bucket, key);
      // 重新加载存储桶对象列表
      await loadBucketObjects(cluster, bucket);
    } catch (err: any) {
      error.value = err.message || "文件删除失败";
      throw err;
    }
  }

  // 自动刷新功能
  function startAutoRefresh(interval = 30000) {
    if (autoRefreshTimer.value) {
      clearInterval(autoRefreshTimer.value);
    }

    isAutoRefreshing.value = true;
    autoRefreshTimer.value = setInterval(async () => {
      if (!isLoading.value) {
        await loadBuckets();
      }
    }, interval);
  }

  function stopAutoRefresh() {
    if (autoRefreshTimer.value) {
      clearInterval(autoRefreshTimer.value);
      autoRefreshTimer.value = null;
    }
    isAutoRefreshing.value = false;
  }

  // 格式化文件大小
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  // 获取文件类型图标
  function getFileIcon(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase();

    const iconMap: Record<string, string> = {
      jpg: "🖼️",
      jpeg: "🖼️",
      png: "🖼️",
      gif: "🖼️",
      svg: "🖼️",
      pdf: "📄",
      doc: "📄",
      docx: "📄",
      txt: "📄",
      md: "📄",
      zip: "🗜️",
      rar: "🗜️",
      tar: "🗜️",
      gz: "🗜️",
      mp4: "🎬",
      avi: "🎬",
      mov: "🎬",
      wmv: "🎬",
      mp3: "🎵",
      wav: "🎵",
      flac: "🎵",
      aac: "🎵",
      js: "⚡",
      ts: "⚡",
      html: "🌐",
      css: "🎨",
      json: "📋",
    };

    return iconMap[ext || ""] || "📁";
  }

  return {
    // 状态
    buckets,
    clusters,
    bucketObjects,
    isLoading,
    error,
    lastUpdateTime,
    isAutoRefreshing,

    // 计算属性
    totalBuckets,
    totalObjects,
    totalSize,
    bucketsByCluster,

    // 动作
    loadBuckets,
    loadClusters,
    loadBucketObjects,
    createBucket,
    deleteBucket,
    uploadFile,
    downloadFile,
    deleteFile,
    startAutoRefresh,
    stopAutoRefresh,
    formatFileSize,
    getFileIcon,
  };
});
