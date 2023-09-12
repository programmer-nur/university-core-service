/* eslint-disable @typescript-eslint/no-explicit-any */
import { OfferedCourseSection, Prisma } from '@prisma/client';
import prisma from '../../../shared/prisma';
import ApiError from '../../../errors/ApiError';
import httpStatus from 'http-status';
import { IOfferedCourseSectionFilter } from './offeredCourseSection.interface';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { IGenericResponse } from '../../../interfaces/common';
import {
  offeredCourseSectionRelationalFields,
  offeredCourseSectionRelationalFieldsMapper,
  offeredCourseSectionSearchableFields,
} from './offeredCourseSection.constans';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import { asyncForEach } from '../../../shared/utils';
import { OfferedCourseClassScheduleUtils } from '../offeredCourseClassSchedule/offeredCourseClassSchedule.utils';

const insertIntoDb = async (payload: any) => {
  const { classSchedule, ...data } = payload;
  console.log('classSchedule', classSchedule);
  const isExist = await prisma.offeredCourse.findFirst({
    where: {
      id: data.offeredCourseId,
    },
  });

  if (!isExist) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Data dose not exist');
  }
  data.semesterRegistrationId = isExist?.semesterRegistrationId;

  await asyncForEach(classSchedule, async (schedule: any) => {
    await OfferedCourseClassScheduleUtils.checkFacultyAvailable(schedule);
    await OfferedCourseClassScheduleUtils.checkRoomIsAvailable(schedule);
  });

  const createSchedule = await prisma.$transaction(async transactionClint => {
    const createOfferedCourseSection =
      await transactionClint.offeredCourseClassSchedule.create({
        data,
      });
    const scheduleData = classSchedule.map((schedule: any) => ({
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      dayOfWeek: schedule.dayOfWeek,
      roomId: schedule.roomId,
      facultyId: schedule.facultyId,
      offeredCoursesSectionId:
        createOfferedCourseSection.offeredCoursesSectionId,
      semesterRegistrationId: isExist.semesterRegistrationId,
    }));
    const createSchedule =
      await transactionClint.offeredCourseClassSchedule.createMany({
        data: scheduleData,
      });
    return createSchedule;
  });
  // const result = await prisma.offeredCourseSection.create({ data });
  // return result;
};

const getAllIntoDb = async (
  filters: IOfferedCourseSectionFilter,
  options: IPaginationOptions
): Promise<IGenericResponse<OfferedCourseSection[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      OR: offeredCourseSectionSearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => {
        if (offeredCourseSectionRelationalFields.includes(key)) {
          return {
            [offeredCourseSectionRelationalFieldsMapper[key]]: {
              id: (filterData as any)[key],
            },
          };
        } else {
          return {
            [key]: {
              equals: (filterData as any)[key],
            },
          };
        }
      }),
    });
  }

  const whereConditions: Prisma.OfferedCourseSectionWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const result = await prisma.offeredCourseSection.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? { [options.sortBy]: options.sortOrder }
        : {
            createdAt: 'desc',
          },
    include: {
      offeredCourses: {
        include: {
          course: true,
        },
      },
    },
  });
  const total = await prisma.offeredCourseSection.count({
    where: whereConditions,
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: result,
  };
};

const getByIdFromDB = async (
  id: string
): Promise<OfferedCourseSection | null> => {
  const result = await prisma.offeredCourseSection.findUnique({
    where: {
      id,
    },
    include: {
      offeredCourses: {
        include: {
          course: true,
        },
      },
    },
  });
  return result;
};

const updateOneInDB = async (
  id: string,
  payload: Partial<OfferedCourseSection>
): Promise<OfferedCourseSection> => {
  //update
  const result = await prisma.offeredCourseSection.update({
    where: {
      id,
    },
    data: payload,
    include: {
      offeredCourses: {
        include: {
          course: true,
        },
      },
    },
  });
  return result;
};

const deleteByIdFromDB = async (id: string): Promise<OfferedCourseSection> => {
  const result = await prisma.offeredCourseSection.delete({
    where: {
      id,
    },
    include: {
      offeredCourses: {
        include: {
          course: true,
        },
      },
    },
  });
  return result;
};

export const OfferedCourseSectionService = {
  insertIntoDb,
  getAllIntoDb,
  getByIdFromDB,
  updateOneInDB,
  deleteByIdFromDB,
};
