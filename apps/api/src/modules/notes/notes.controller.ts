import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Tenant } from '../../common/decorators.js';
import type { AuthUser, TenantContext } from '../../common/types.js';
import { CreateNoteDto, ListNotesQueryDto, UpdateNoteDto } from './notes.dto.js';
import { NotesService } from './notes.service.js';

/** Notes for later — any role; private unless shared with the business. */
@ApiTags('notes')
@ApiBearerAuth()
@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get()
  list(@Tenant() tenant: TenantContext, @CurrentUser() user: AuthUser, @Query() query: ListNotesQueryDto) {
    return this.notes.list(tenant, user, query);
  }

  @Get(':id')
  get(@Tenant() tenant: TenantContext, @CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notes.get(tenant, user, id);
  }

  @Post()
  create(@Tenant() tenant: TenantContext, @CurrentUser() user: AuthUser, @Body() body: CreateNoteDto) {
    return this.notes.create(tenant, user, body);
  }

  @Patch(':id')
  update(
    @Tenant() tenant: TenantContext,
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateNoteDto,
  ) {
    return this.notes.update(tenant, user, id, body);
  }

  @Delete(':id')
  delete(@Tenant() tenant: TenantContext, @CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notes.delete(tenant, user, id);
  }
}
