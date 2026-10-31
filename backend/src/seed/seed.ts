import { Logger } from "@nestjs/common"
import { hash } from "bcryptjs"
import { randomBytes } from "node:crypto"
import type { PrismaClient } from "../generated/prisma/client.js"
import {
  ADMIN_PROFILE,
  ALBUMS,
  ARTISTS,
  COMMENTERS,
  COMMENTS,
  FEED_POSTS,
  PLAYLISTS,
  TRACKS,
  type MediaRef,
} from "./seed-data.js"

const BCRYPT_ROUNDS = 10
const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * MINUTE_MS

export interface SeedOptions {
  adminEmail?: string
  adminPassword?: string
  /** Public base URL of the R2 bucket, e.g. https://pub-xxxx.r2.dev. Without it the seed is skipped. */
  mediaBaseUrl?: string
}

/**
 * Loads the mock catalog into the database. Safe to run repeatedly: content is upserted by id,
 * relation rows are only added when missing, and user data is never deleted.
 */
export async function runSeed(prisma: PrismaClient, options: SeedOptions): Promise<void> {
  const log = new Logger("Seed")
  const { adminEmail, adminPassword } = options
  const mediaBaseUrl = options.mediaBaseUrl?.trim()
  // Every cover and audio link starts with the bucket address; a missing one must not stop the API.
  if (!mediaBaseUrl) {
    log.warn("R2_PUBLIC_URL is not set: skipping the seed (set it to the public URL of the bucket)")
    return
  }
  if (!adminEmail || !adminPassword) {
    throw new Error("Seed needs SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD")
  }
  const media = (ref: MediaRef) => `${mediaBaseUrl.replace(/\/$/, "")}/${ref.folder}/${ref.file}`

  // Users
  const admin = await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    create: {
      email: adminEmail.toLowerCase(),
      name: ADMIN_PROFILE.name,
      avatarUrl: media(ADMIN_PROFILE.avatar),
      passwordHash: await hash(adminPassword, BCRYPT_ROUNDS),
      role: "ADMIN",
    },
    update: { role: "ADMIN", avatarUrl: media(ADMIN_PROFILE.avatar) },
  })
  for (const user of COMMENTERS) {
    await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: media(user.avatar),
        passwordHash: await hash(randomBytes(24).toString("hex"), BCRYPT_ROUNDS),
      },
      update: { name: user.name, avatarUrl: media(user.avatar) },
    })
  }

  // Catalog
  for (const artist of ARTISTS) {
    const data = {
      name: artist.name,
      bio: artist.bio,
      imageUrl: media(artist.image),
      baseFollowers: artist.baseFollowers,
      region: artist.region,
    }
    await prisma.artist.upsert({
      where: { id: artist.id },
      create: { id: artist.id, ...data },
      update: data,
    })
  }
  for (const track of TRACKS) {
    const data = {
      title: track.title,
      artistId: track.artistId,
      coverUrl: media(track.cover),
      audioUrl: media(track.audio),
      durationSec: track.durationSec,
      youtubeVideoId: track.youtubeVideoId ?? null,
    }
    await prisma.track.upsert({
      where: { id: track.id },
      create: { id: track.id, plays: track.plays, ...data },
      update: data,
    })
  }
  for (const album of ALBUMS) {
    const data = { title: album.title, artistId: album.artistId, coverUrl: media(album.cover) }
    await prisma.album.upsert({
      where: { id: album.id },
      create: { id: album.id, ...data },
      update: data,
    })
    await prisma.albumTrack.createMany({
      data: album.trackIds.map((trackId, position) => ({ albumId: album.id, trackId, position })),
      skipDuplicates: true,
    })
  }
  for (const playlist of PLAYLISTS) {
    const data = {
      name: playlist.name,
      description: playlist.description,
      coverUrl: media(playlist.cover),
      isOfficial: playlist.official,
      ownerId: playlist.official ? null : admin.id,
    }
    await prisma.playlist.upsert({
      where: { id: playlist.id },
      create: { id: playlist.id, ...data },
      update: data,
    })
    await prisma.playlistTrack.createMany({
      data: playlist.trackIds.map((trackId, position) => ({
        playlistId: playlist.id,
        trackId,
        position,
      })),
      skipDuplicates: true,
    })
  }

  // Feed and comments
  for (const post of FEED_POSTS) {
    const data = { artistId: post.artistId, trackId: post.trackId, artworkUrl: media(post.artwork) }
    await prisma.feedPost.upsert({
      where: { id: post.id },
      create: { id: post.id, createdAt: new Date(Date.now() - post.daysAgo * DAY_MS), ...data },
      update: data,
    })
  }
  for (const comment of COMMENTS) {
    const parentId = "parentId" in comment ? comment.parentId : undefined
    await prisma.comment.upsert({
      where: { id: comment.id },
      create: {
        id: comment.id,
        text: comment.text,
        userId: comment.userId,
        postId: comment.postId,
        parentId,
        createdAt: new Date(Date.now() - comment.minutesAgo * MINUTE_MS),
      },
      update: { text: comment.text },
    })
    await prisma.commentLike.createMany({
      data: comment.likedBy.map((userId) => ({ userId, commentId: comment.id })),
      skipDuplicates: true,
    })
  }

  // Starting library of the demo admin account
  const userId = admin.id
  await prisma.trackLike.createMany({
    data: ADMIN_PROFILE.likedTrackIds.map((trackId) => ({ userId, trackId })),
    skipDuplicates: true,
  })
  await prisma.playlistLike.createMany({
    data: ADMIN_PROFILE.likedPlaylistIds.map((playlistId) => ({ userId, playlistId })),
    skipDuplicates: true,
  })
  await prisma.albumLike.createMany({
    data: ADMIN_PROFILE.likedAlbumIds.map((albumId) => ({ userId, albumId })),
    skipDuplicates: true,
  })
  await prisma.follow.createMany({
    data: ADMIN_PROFILE.followedArtistIds.map((artistId) => ({ userId, artistId })),
    skipDuplicates: true,
  })

  log.log(
    `Seeded ${ARTISTS.length} artists, ${TRACKS.length} tracks, ${ALBUMS.length} albums, ` +
      `${PLAYLISTS.length} playlists, ${FEED_POSTS.length} posts, ${COMMENTS.length} comments`,
  )
}
