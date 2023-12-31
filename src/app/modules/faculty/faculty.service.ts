/* eslint-disable @typescript-eslint/no-explicit-any */

import { CourseFaculty, Faculty, Prisma, Student } from '@prisma/client';
import prisma from '../../../shared/prisma';
import IFacultyFilter, {
  FacultyCreatedEvent,
  IFacultyMyCourseStudentsRequest,
} from './faculty.interface';
import { IPaginationOptions } from '../../../interfaces/pagination';
import { IGenericResponse } from '../../../interfaces/common';
import { paginationHelpers } from '../../../helpers/paginationHelper';
import {
  facultyRelationalFields,
  facultyRelationalFieldsMapper,
  facultySearchableField,
} from './faculty.constans';

const createFaculty = async (facultyData: Faculty): Promise<Faculty> => {
  const result = await prisma.faculty.create({
    data: facultyData,
    include: {
      academicFaculty: true,
      academicDepartment: true,
    },
  });
  return result;
};
const getAllFaculty = async (
  filters: IFacultyFilter,
  options: IPaginationOptions
): Promise<IGenericResponse<Faculty[]>> => {
  const { page, limit, sortBy, sortOrder, skip } =
    paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = filters;

  const andConditions = [];

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => {
        if (facultyRelationalFields.includes(key)) {
          return {
            [facultyRelationalFieldsMapper[key]]: {
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

  if (searchTerm) {
    andConditions.push({
      OR: facultySearchableField.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }
  const whereConditions: Prisma.FacultyWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};
  const total = await prisma.faculty.count({ where: whereConditions });
  const result = await prisma.faculty.findMany({
    where: whereConditions,
    orderBy:
      sortBy && sortOrder ? { [sortBy]: sortOrder } : { createdAt: 'desc' },
    skip,
    take: limit,
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
const getSingleFaculty = async (id: string) => {
  const result = await prisma.faculty.findUnique({
    where: { id },
    include: {
      academicFaculty: true,
      academicDepartment: true,
    },
  });
  return result;
};

const updateFaculty = async (
  id: string,
  payload: Partial<Faculty>
): Promise<Faculty> => {
  const result = await prisma.faculty.update({
    where: { id },
    include: {
      academicDepartment: true,
      academicFaculty: true,
    },
    data: payload,
  });
  return result;
};
const deleteFaculty = async (id: string): Promise<Faculty> => {
  const result = await prisma.faculty.delete({
    where: { id },
    include: {
      academicDepartment: true,
      academicFaculty: true,
    },
  });
  return result;
};

const assignCourses = async (
  id: string,
  payload: string[]
): Promise<CourseFaculty[]> => {
  await prisma.courseFaculty.createMany({
    data: payload.map(courseId => ({
      facultyId: id,
      courseId,
    })),
  });

  const assignCourseData = await prisma.courseFaculty.findMany({
    where: {
      facultyId: id,
    },
    include: {
      course: true,
    },
  });

  return assignCourseData;
};

const removeAssignCourses = async (
  id: string,
  payload: string[]
): Promise<CourseFaculty[] | null> => {
  await prisma.courseFaculty.deleteMany({
    where: {
      facultyId: id,
      courseId: {
        in: payload,
      },
    },
  });
  const assignCourseData = await prisma.courseFaculty.findMany({
    where: {
      facultyId: id,
    },
    include: {
      course: true,
    },
  });
  return assignCourseData;
};

const myCourses = async (
  authUser: {
    userId: string;
    role: string;
  },
  filter: {
    academicSemesterId?: string | null | undefined;
    courseId?: string | null | undefined;
  }
) => {
  if (!filter.academicSemesterId) {
    const currentSemester = await prisma.academicSemester.findFirst({
      where: {
        isCurrent: true,
      },
    });

    filter.academicSemesterId = currentSemester?.id;
  }

  const offeredCourseSections = await prisma.offeredCourseSection.findMany({
    where: {
      offeredCourseClassSchedules: {
        some: {
          faculty: {
            facultyId: authUser.userId,
          },
        },
      },
      offeredCourses: {
        semesterRegistration: {
          academicSemester: {
            id: filter.academicSemesterId,
          },
        },
      },
    },
    include: {
      offeredCourses: {
        include: {
          course: true,
        },
      },
      offeredCourseClassSchedules: {
        include: {
          room: {
            include: {
              building: true,
            },
          },
        },
      },
    },
  });

  const couseAndSchedule = offeredCourseSections.reduce(
    (acc: any, obj: any) => {
      //console.log(obj)

      const course = obj.offeredCourse.course;
      const classSchedules = obj.offeredCourseClassSchedules;

      const existingCourse = acc.find(
        (item: any) => item.couse?.id === course?.id
      );
      if (existingCourse) {
        existingCourse.sections.push({
          section: obj,
          classSchedules,
        });
      } else {
        acc.push({
          course,
          sections: [
            {
              section: obj,
              classSchedules,
            },
          ],
        });
      }
      return acc;
    },
    []
  );
  return couseAndSchedule;
};
const getMyCourseStudents = async (
  filters: IFacultyMyCourseStudentsRequest,
  options: IPaginationOptions,
  authUser: any
): Promise<IGenericResponse<Student[]>> => {
  const { limit, page, skip } = paginationHelpers.calculatePagination(options);
  console.log(authUser);
  if (!filters.academicSemesterId) {
    const currentAcademicSemester = await prisma.academicSemester.findFirst({
      where: {
        isCurrent: true,
      },
    });

    if (currentAcademicSemester) {
      filters.academicSemesterId = currentAcademicSemester.id;
    }
  }

  const offeredCourseSections =
    await prisma.studentSemesterRegistrationCourse.findMany({
      where: {
        offeredCourse: {
          course: {
            id: filters.courseId,
          },
        },
        offeredCourseSection: {
          offeredCourses: {
            semesterRegistration: {
              academicSemester: {
                id: filters.academicSemesterId,
              },
            },
          },
          id: filters.offeredCourseSectionId,
        },
      },
      include: {
        student: true,
      },
      take: limit,
      skip,
    });

  const students = offeredCourseSections.map(
    offeredCourseSection => offeredCourseSection.student
  );

  const total = await prisma.studentSemesterRegistrationCourse.count({
    where: {
      offeredCourse: {
        course: {
          id: filters.courseId,
        },
      },
      offeredCourseSection: {
        offeredCourses: {
          semesterRegistration: {
            academicSemester: {
              id: filters.academicSemesterId,
            },
          },
        },
        id: filters.offeredCourseSectionId,
      },
    },
  });

  return {
    meta: {
      total,
      page,
      limit,
    },
    data: students,
  };
};

const createFacultyFromEvent = async (
  e: FacultyCreatedEvent
): Promise<void> => {
  const faculty: Partial<Faculty> = {
    facultyId: e.id,
    firstName: e.name.firstName,
    lastName: e.name.lastName,
    middleName: e.name.middleName,
    profileImage: e.profileImage,
    email: e.email,
    contactNo: e.contactNo,
    gender: e.gender,
    bloodGroup: e.bloodGroup,
    designation: e.designation,
    academicDepartmentId: e.academicDepartment.syncId,
    academicFacultyId: e.academicFaculty.syncId,
  };

  const data = await createFaculty(faculty as Faculty);
  console.log('RES: ', data);
};

const updateFacultyFromEvent = async (e: any): Promise<void> => {
  const isExist = await prisma.faculty.findFirst({
    where: {
      facultyId: e.id,
    },
  });
  if (!isExist) {
    createFacultyFromEvent(e);
  } else {
    const facultyData: Partial<Faculty> = {
      facultyId: e.id,
      firstName: e.name.firstName,
      lastName: e.name.lastName,
      middleName: e.name.middleName,
      profileImage: e.profileImage,
      email: e.email,
      contactNo: e.contactNo,
      gender: e.gender,
      bloodGroup: e.bloodGroup,
      designation: e.designation,
      academicDepartmentId: e.academicDepartment.syncId,
      academicFacultyId: e.academicFaculty.syncId,
    };

    const res = await prisma.faculty.updateMany({
      where: {
        facultyId: e.id,
      },
      data: facultyData,
    });
    console.log(res);
  }
};
export const FacultyService = {
  createFaculty,
  getAllFaculty,
  getSingleFaculty,
  updateFaculty,
  deleteFaculty,
  assignCourses,
  myCourses,
  removeAssignCourses,
  getMyCourseStudents,
  updateFacultyFromEvent,
  createFacultyFromEvent,
};
