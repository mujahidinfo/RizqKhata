import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Tenant } from '../../common/decorators.js';
import type { AuthUser, TenantContext } from '../../common/types.js';
import {
  AddJobNoteDto,
  ChangeJobStatusDto,
  CreateJobDto,
  DeliverJobDto,
  ListJobsQueryDto,
  UpdateJobDto,
} from './jobs.dto.js';
import { JobsService } from './jobs.service.js';

/** Service jobs (repairs) in the active branch — any role can take in and update. */
@ApiTags('jobs')
@ApiBearerAuth()
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  list(@Tenant() tenant: TenantContext, @Query() query: ListJobsQueryDto) {
    return this.jobs.list(tenant, query);
  }

  // Declared before ':id' so "summary" isn't captured as an id.
  @Get('summary')
  summary(@Tenant() tenant: TenantContext) {
    return this.jobs.summary(tenant);
  }

  @Get(':id')
  get(@Tenant() tenant: TenantContext, @Param('id') id: string) {
    return this.jobs.get(tenant, id);
  }

  @Post()
  create(@Tenant() tenant: TenantContext, @CurrentUser() user: AuthUser, @Body() body: CreateJobDto) {
    return this.jobs.create(tenant, user, body);
  }

  @Patch(':id')
  update(@Tenant() tenant: TenantContext, @Param('id') id: string, @Body() body: UpdateJobDto) {
    return this.jobs.update(tenant, id, body);
  }

  @Post(':id/status')
  changeStatus(
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: ChangeJobStatusDto,
  ) {
    return this.jobs.changeStatus(tenant, user, id, body);
  }

  @Post(':id/notes')
  addNote(
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: AddJobNoteDto,
  ) {
    return this.jobs.addNote(tenant, user, id, body);
  }

  /** Bill the job (a normal sale, advance deducted) and mark it delivered. */
  @Post(':id/deliver')
  deliver(
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: DeliverJobDto,
  ) {
    return this.jobs.deliver(tenant, user, id, body);
  }
}
