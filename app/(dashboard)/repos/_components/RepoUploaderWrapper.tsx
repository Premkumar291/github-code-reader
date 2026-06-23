"use client";

import { useRouter } from "next/navigation";
import RepoUploader from "@/components/RepoUploader";

export default function RepoUploaderWrapper() {
  const router = useRouter();
  return <RepoUploader onIndexed={() => router.refresh()} />;
}
