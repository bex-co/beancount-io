import { ArgsType, Field, ObjectType } from "type-graphql";

@ObjectType()
export class UserProfile {
  @Field(() => String)
  username: string;

  @Field(() => String, { nullable: true })
  fullName?: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string;

  @Field(() => String, { nullable: true })
  bio?: string;

  @Field(() => String, { nullable: true })
  location?: string;

  @Field(() => String, { nullable: true })
  website?: string;

  @Field(() => Number)
  followersCount: number;

  @Field(() => Number)
  followingCount: number;

  @Field(() => Number)
  starredReposCount: number;

  @Field(() => Date, { nullable: true })
  created?: Date;
}

@ObjectType()
export class UserActivityFeedItem {
  @Field(() => String)
  id: string;

  @Field(() => String)
  type: string;

  @Field(() => String)
  content: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => String, { nullable: true })
  repoName?: string;

  @Field(() => String, { nullable: true })
  repoFullName?: string;
}

@ObjectType()
export class UserRepository {
  @Field(() => String)
  name: string;

  @Field(() => String)
  fullName: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Boolean)
  isPrivate: boolean;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}

@ObjectType()
export class PublicUserProfileResponse {
  @Field(() => UserProfile)
  profile: UserProfile;

  @Field(() => Boolean, {
    nullable: true,
    description: "Only present if user is authenticated",
  })
  isFollowing?: boolean;

  @Field(() => [UserActivityFeedItem])
  activities: UserActivityFeedItem[];

  @Field(() => [UserRepository])
  repositories: UserRepository[];
}

@ObjectType()
export class FollowUserResponse {
  @Field(() => Boolean)
  success: boolean;

  @Field(() => Boolean, { nullable: true })
  isFollowing?: boolean;

  @Field(() => String, { nullable: true })
  message?: string;
}

@ArgsType()
export class GetUserProfileArgs {
  @Field(() => String, { description: "Username to fetch profile for" })
  username: string;
}

@ArgsType()
export class FollowUserArgs {
  @Field(() => String, { description: "Username to follow" })
  username: string;
}

@ObjectType()
export class UserListItem {
  @Field(() => String)
  username: string;

  @Field(() => String, { nullable: true })
  fullName?: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string;

  @Field(() => String, { nullable: true })
  bio?: string;
}

@ObjectType()
export class UserListResponse {
  @Field(() => [UserListItem])
  users: UserListItem[];

  @Field(() => Number)
  total: number;
}

@ObjectType()
export class RepositoryListItem {
  @Field(() => String)
  name: string;

  @Field(() => String)
  fullName: string;

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => Boolean)
  isPrivate: boolean;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => Number, { nullable: true })
  starsCount?: number;
}

@ObjectType()
export class RepositoryListResponse {
  @Field(() => [RepositoryListItem])
  repositories: RepositoryListItem[];

  @Field(() => Number)
  total: number;
}

@ArgsType()
export class GetUserListArgs {
  @Field(() => String, { description: "Username to fetch list for" })
  username: string;

  @Field(() => Number, { nullable: true, defaultValue: 1 })
  page?: number;

  @Field(() => Number, { nullable: true, defaultValue: 20 })
  limit?: number;
}
