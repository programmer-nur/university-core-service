-- CreateTable
CREATE TABLE "StudentSemesterRegistration" (
    "id" TEXT NOT NULL,
    "isConfirmed" BOOLEAN DEFAULT false,
    "totalCreditsTaken" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "studentId" TEXT NOT NULL,
    "semesterRegistrationId" TEXT NOT NULL,

    CONSTRAINT "StudentSemesterRegistration_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StudentSemesterRegistration" ADD CONSTRAINT "StudentSemesterRegistration_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSemesterRegistration" ADD CONSTRAINT "StudentSemesterRegistration_semesterRegistrationId_fkey" FOREIGN KEY ("semesterRegistrationId") REFERENCES "semester_registration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
