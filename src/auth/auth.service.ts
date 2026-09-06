import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { Role } from '../common/enums/role.enum';
import { User } from '../users/user.model';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService, private jwtService: JwtService) {}

  async signup(params: { email: string; password: string; name: string }) {
    // Public signup always creates an editor; only an existing admin can promote users.
    const user = await this.usersService.create({ ...params, role: Role.EDITOR });
    return this.buildTokenResponse(user);
  }

  async login(email: string, password: string) {
    const user = await this.usersService.validateCredentials(email, password);
    if (!user) throw new UnauthorizedException('Invalid email or password');
    return this.buildTokenResponse(user);
  }

  private buildTokenResponse(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    };
  }
}
