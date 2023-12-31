export const studentSearchableField = [
  'firstName',
  'lastName',
  'middleName',
  'email',
  'contactNo',
  'studentId',
];
export const studentFilterableFields = [
  'searchTerm',
  'studentId',
  'firstName',
  'studentId',
  'email',
  'contactNo',
  'gender',
  'academicFacultyId',
  'academicDepartmentId',
  'academicSemesterId',
];

export const studentRelationalFields: string[] = [
  'academicFacultyId',
  'academicDepartmentId',
  'academicSemesterId',
];
export const studentRelationalFieldsMapper: { [key: string]: string } = {
  academicFacultyId: 'academicFaculty',
  academicDepartmentId: 'academicDepartment',
  academicSemesterId: 'academicSemester',
};
export const EVENT_STUDENT_CREATED = 'student-created';
export const EVENT_STUDENT_UPDATED = 'student.updated';
