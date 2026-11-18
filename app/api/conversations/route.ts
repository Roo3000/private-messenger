import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest } from "@/lib/requestUser";

export async function GET(req: Request) {
  const auth = getUserFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: auth.userId },
    include: {
      conversation: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      conversation: { updatedAt: "desc" },
    },
  });

  const conversations = memberships.map((m) => {
    const c = m.conversation;
    const last = c.messages[0] || null;
    return {
      id: c.id,
      isGroup: c.isGroup,
      title: c.title,
      updatedAt: c.updatedAt.toISOString(),
      members: c.members.map((mem) => ({
        id: mem.user.id,
        username: mem.user.username,
        displayName: mem.user.displayName,
        avatarUrl: mem.user.avatarUrl,
      })),
      lastMessage: last
        ? {
            id: last.id,
            body: last.body,
            createdAt: last.createdAt.toISOString(),
            senderId: last.senderId,
            sender: last.sender,
          }
        : null,
    };
  });

  return NextResponse.json({ conversations });
}

/** Start (or return existing) 1:1 conversation with another user by username */
export async function POST(req: Request) {
  const auth = getUserFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const username = String(body.username || "")
    .trim()
    .toLowerCase();

  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }

  if (username === auth.username) {
    return NextResponse.json(
      { error: "Cannot chat with yourself" },
      { status: 400 }
    );
  }

  const other = await prisma.user.findUnique({ where: { username } });
  if (!other) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Find existing 1:1 conversation between the two users
  const existing = await prisma.conversation.findFirst({
    where: {
      isGroup: false,
      AND: [
        { members: { some: { userId: auth.userId } } },
        { members: { some: { userId: other.id } } },
      ],
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (existing) {
    return NextResponse.json({
      conversation: {
        id: existing.id,
        isGroup: existing.isGroup,
        title: existing.title,
        updatedAt: existing.updatedAt.toISOString(),
        members: existing.members.map((m) => m.user),
      },
    });
  }

  const conversation = await prisma.conversation.create({
    data: {
      isGroup: false,
      members: {
        create: [{ userId: auth.userId }, { userId: other.id }],
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      isGroup: conversation.isGroup,
      title: conversation.title,
      updatedAt: conversation.updatedAt.toISOString(),
      members: conversation.members.map((m) => m.user),
    },
  });
}