import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { StrollsModule } from './strolls/strolls.module';
import { StagesModule } from './stages/stages.module';
import { AchivementsModule } from './achivements/achivements.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      'mongodb+srv://admin:admin@cluster0.iijhz.mongodb.net/StrollBar?retryWrites=true&w=majority',
    ),
    StrollsModule,
    StagesModule,
    AchivementsModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
