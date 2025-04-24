import { Switch } from '@headlessui/react';
import { Save, Trash2, User, CalendarDays, Banknote } from 'lucide-react';
// import DetailItem from './DetailItem';

export default function StudentProfile({ student, formData, setFormData, handleStudentUpdate }) {
    return (
        <div className="md:w-1/3 space-y-6 sticky top-6 h-fit overflow-y-auto ">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <User className="w-10 h-10 text-purple-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 capitalize">{student.fname} {student.lname}</h2>
                    <p className="text-gray-600 mt-1 font-bold">{student.class} - {student.div}</p>
                    <p className="text-sm text-purple-600 font-mono mt-2">{student.feeId}</p>
                </div>

                <div className="space-y-4">
                    <DetailItem icon={<CalendarDays />} label="Academic Year" value={student.academicYear} />
                    <DetailItem icon={<User />} label="Student Type" value={student.type} />
                    <DetailItem icon={<Banknote />} label="Status">
                        <Switch
                            checked={formData.status === 'active'}
                            onChange={(val) => setFormData({ ...formData, status: val ? 'active' : 'inactive' })}
                            className={`${formData.status === 'active' ? 'bg-purple-600' : 'bg-gray-200'} 
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors`}
                        >
                            <span className={`${formData.status === 'active' ? 'translate-x-6' : 'translate-x-1'} 
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                        </Switch>
                    </DetailItem>
                    <DetailItem icon={<CalendarDays />} label="Created At"
                        value={new Date(student.createdAt?.seconds * 1000).toLocaleDateString()} />
                </div>

                <div className="mt-6 space-y-4">
                    <button
                        onClick={handleStudentUpdate}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2.5 rounded-lg flex items-center justify-center"
                    >
                        <Save className="w-5 h-5 mr-2" /> Update Details
                    </button>
                    <button
                        className="w-full text-red-600 hover:text-red-700 font-medium py-2.5 rounded-lg border border-red-200 hover:border-red-300 flex items-center justify-center"
                    >
                        <Trash2 className="w-5 h-5 mr-2" /> Delete Student
                    </button>
                </div>
            </div>
        </div>
    );
}
const DetailItem = ({ icon, label, value, children }) => (
    <div className="flex items-center justify-between py-2">
        <div className="flex items-center text-gray-600">
            <span className="mr-2 text-purple-500">{icon}</span>
            {label}
        </div>
        {children || <span className="font-medium">{value || '-'}</span>}
    </div>
);
