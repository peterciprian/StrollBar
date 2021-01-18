import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { StrollsModule } from './strolls/strolls.module';

@Module({
  imports: [
    MongooseModule.forRoot(
      'mongodb+srv://Peter:jjkj@klaszter.j7gtn.mongodb.net/Teszt?retryWrites=true&w=majority',
    ),
    StrollsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
