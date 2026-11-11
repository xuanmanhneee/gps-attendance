import { FiArrowUpRight, FiUsers } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import type { Course } from '../types';

export function CourseGrid({ courses }: { courses: Course[] }) {
  return (
    <div className="course-grid">
      {courses.map((course, index) => (
        <Link className={`course-card course-card--${index % 3}`} to={`/courses/${course.id}`} key={course.id}>
          <div className="course-card__cover"><span>Học kỳ 1</span><b>{course.code}</b></div>
          <div className="course-card__body">
            <h3>{course.name}</h3>
            <p><FiUsers aria-hidden="true" /> Giảng viên {course.lecturerCode}</p>
            <strong>Xem lớp học <FiArrowUpRight aria-hidden="true" /></strong>
          </div>
        </Link>
      ))}
    </div>
  );
}
