import type { MemberType, VerificationStatus } from "./constants";

export type User = {
  id: string;
  email: string;
  name: string;
  handle: string;
  avatar_key: string | null;
  banner_key: string | null;
  bio: string;
  specialty: string;
  location: string;
  website: string;
  instagram: string;
  role: "user" | "admin";
  member_type: MemberType;
  verification_status: VerificationStatus;
  status: "active" | "suspended" | "banned";
  followers_count: number;
  following_count: number;
  created_at: string;
};

/** Vídeo já com os dados do canal (join), usado nos cards e listas. */
export type VideoCardData = {
  id: string;
  title: string;
  thumb_key: string | null;
  duration: number;
  views: number;
  likes: number;
  comments_count: number;
  responses_count: number;
  category: string;
  created_at: string;
  parent_id: string | null;
  user_id: string;
  channel_name: string;
  channel_handle: string;
  channel_avatar: string | null;
  channel_member_type: MemberType;
};

export type VideoFull = VideoCardData & {
  description: string;
  tags: string;
  video_key: string | null;
  tech: string;
  visibility: "public" | "unlisted";
  status: "published" | "hidden" | "removed";
  channel_followers: number;
  channel_specialty: string;
};

export type CommentData = {
  id: string;
  video_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  status: "visible" | "hidden";
  likes: number;
  replies_count: number;
  created_at: string;
  author_name: string;
  author_handle: string;
  author_avatar: string | null;
  author_member_type: MemberType;
  liked_by_me: number;
};

export type ChannelCardData = {
  id: string;
  name: string;
  handle: string;
  avatar_key: string | null;
  specialty: string;
  member_type: MemberType;
  followers_count: number;
  videos_count: number;
  last_video_id: string | null;
  last_video_title: string | null;
  last_video_thumb: string | null;
};

export type ActionState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string>; message?: string };
