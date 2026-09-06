import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

export interface ArticlePublishedPayload {
  id: string;
  slug: string;
  title: string;
  tags: string[];
}

// A dedicated real-time channel, separate from the REST API surface — the REST
// controllers never talk to Socket.IO directly, they just emit a domain event.
@Injectable()
@WebSocketGateway({ cors: { origin: '*' } })
export class RealtimeGateway {
  @WebSocketServer()
  private server: Server;

  @OnEvent('article.published')
  handleArticlePublished(payload: ArticlePublishedPayload) {
    this.server?.emit('article.published', payload);
  }
}
