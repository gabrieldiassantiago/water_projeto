import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { HydrationGoalsService } from './hydration-goals.service';
import { CreateHydrationGoalDto } from './dto/create-hydration-goal.dto';
import { UpdateHydrationGoalDto } from './dto/update-hydration-goal.dto';

@Controller('hydration-goals')
export class HydrationGoalsController {
    constructor(
        private readonly hydrationGoalsService: HydrationGoalsService,
    ) { }

    @Post()
    create(@Body() dto: CreateHydrationGoalDto) {
        const temporaryUserId = 1;

        return this.hydrationGoalsService.create(temporaryUserId, dto);
    }

    @Get('current')
    findCurrent() {
        const temporaryUserId = 1;

        return this.hydrationGoalsService.findCurrent(temporaryUserId);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateHydrationGoalDto,
    ) {
        const temporaryUserId = 1;

        return this.hydrationGoalsService.update(id, temporaryUserId, dto);
    }

    @Get('progress')
    getProgress() {
        const temporaryUserId = 1;

        return this.hydrationGoalsService.getProgress(temporaryUserId);
    }
}
