import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Employee, AttendanceRecord, AttendanceStatus, Admin } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Employees
export const saveEmployee = async (employee: Employee) => {
  const path = `employees/${employee.employeeId}`;
  try {
    const dataToSave = {
      ...employee,
      updatedAt: Date.now()
    };
    
    Object.keys(dataToSave).forEach(key => {
      if (dataToSave[key as keyof typeof dataToSave] === undefined) {
        delete dataToSave[key as keyof typeof dataToSave];
      }
    });

    await setDoc(doc(db, 'employees', employee.employeeId), dataToSave);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteEmployee = async (employeeId: string) => {
  const path = `employees/${employeeId}`;
  try {
    await deleteDoc(doc(db, 'employees', employeeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

// Attendance
export const saveAttendance = async (record: AttendanceRecord) => {
  const id = `${record.employeeId}_${record.date}`;
  const path = `attendance/${id}`;
  try {
    const dataToSave = {
      ...record,
      updatedAt: Date.now()
    };
    
    // Remove undefined values to prevent Firestore errors
    Object.keys(dataToSave).forEach(key => {
      if (dataToSave[key as keyof typeof dataToSave] === undefined) {
        delete dataToSave[key as keyof typeof dataToSave];
      }
    });

    await setDoc(doc(db, 'attendance', id), dataToSave);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getAttendanceForMonth = (month: string, callback: (records: AttendanceRecord[]) => void) => {
  // month format: YYYY-MM
  const q = query(
    collection(db, 'attendance'),
    where('date', '>=', `${month}-01`),
    where('date', '<=', `${month}-31`)
  );

  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map(doc => doc.data() as AttendanceRecord);
    callback(records);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'attendance');
  });
};

export const subscribeToEmployees = (callback: (employees: Employee[]) => void) => {
  return onSnapshot(collection(db, 'employees'), (snapshot) => {
    const employees = snapshot.docs.map(doc => doc.data() as Employee);
    callback(employees);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'employees');
  });
};

// Admins
export const saveAdmin = async (admin: Admin) => {
  const path = `admins/${admin.id}`;
  try {
    const dataToSave = {
      ...admin,
      updatedAt: Date.now()
    };
    
    Object.keys(dataToSave).forEach(key => {
      if (dataToSave[key as keyof typeof dataToSave] === undefined) {
        delete dataToSave[key as keyof typeof dataToSave];
      }
    });

    await setDoc(doc(db, 'admins', admin.id), dataToSave);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteAdmin = async (adminId: string) => {
  const path = `admins/${adminId}`;
  try {
    await deleteDoc(doc(db, 'admins', adminId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const subscribeToAdmins = (callback: (admins: Admin[]) => void) => {
  return onSnapshot(collection(db, 'admins'), (snapshot) => {
    const admins = snapshot.docs.map(doc => doc.data() as Admin);
    callback(admins);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'admins');
  });
};
