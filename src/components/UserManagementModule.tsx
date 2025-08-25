import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Search, UserCheck, UserX } from 'lucide-react';
import { getUsers, registerUser, updateUser, deleteUser, UsuarioSinPassword } from '../lib/database';
import { CreateUserRequest, UpdateUserRequest } from '../types/database';

export const UserManagementModule: React.FC = () => {
  const [users, setUsers] = useState<UsuarioSinPassword[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioSinPassword | null>(null);
  const [error, setError] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState<CreateUserRequest>({
    username: '',
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    role: 'user'
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const userList = await getUsers();
      setUsers(userList);
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async () => {
    try {
      await registerUser(formData);
      setShowCreateModal(false);
      resetForm();
      loadUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      setError('Error al crear usuario');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      const updateData: UpdateUserRequest = {
        username: formData.username,
        email: formData.email,
        nombre: formData.nombre,
        apellido: formData.apellido,
        role: formData.role,
        activo: true
      };

      // Only include password if it was provided
      if (formData.password.trim()) {
        updateData.password = formData.password;
      }

      await updateUser(editingUser.id, updateData);
      setEditingUser(null);
      resetForm();
      loadUsers();
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Error al actualizar usuario');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario?')) return;

    try {
      await deleteUser(userId);
      loadUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Error al eliminar usuario');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      nombre: '',
      apellido: '',
      role: 'user'
    });
    setError('');
  };

  const openEditModal = (user: UsuarioSinPassword) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      password: '', // Don't populate password for security
      nombre: user.nombre,
      apellido: user.apellido,
      role: user.role
    });
  };

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.apellido.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Gestión de Usuarios</h2>
            <p className="text-slate-600">Administra los usuarios del sistema</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 flex items-center space-x-2 shadow-lg"
        >
          <Plus className="h-4 w-4" />
          <span>Crear Usuario</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar usuarios..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Usuario</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Nombre</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Rol</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Estado</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-slate-700">
                          {user.nombre.charAt(0)}{user.apellido.charAt(0)}
                        </span>
                      </div>
                      <span className="font-medium text-slate-900">{user.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    {user.nombre} {user.apellido}
                  </td>
                  <td className="px-6 py-4 text-slate-700">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      {user.activo ? (
                        <>
                          <UserCheck className="h-4 w-4 text-green-600" />
                          <span className="text-green-700 text-sm">Activo</span>
                        </>
                      ) : (
                        <>
                          <UserX className="h-4 w-4 text-red-600" />
                          <span className="text-red-700 text-sm">Inactivo</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar usuario"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-500">
              {searchTerm ? 'No se encontraron usuarios' : 'No hay usuarios registrados'}
            </p>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleCreateUser}
          onCancel={() => {
            setShowCreateModal(false);
            resetForm();
          }}
        />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleUpdateUser}
          onCancel={() => {
            setEditingUser(null);
            resetForm();
          }}
        />
      )}
    </div>
  );
};

// Create User Modal Component
const CreateUserModal: React.FC<{
  formData: CreateUserRequest;
  setFormData: (data: CreateUserRequest) => void;
  onSubmit: () => void;
  onCancel: () => void;
}> = ({ formData, setFormData, onSubmit, onCancel }) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await onSubmit();
    setLoading(false);
  };

  return (
    <Modal title="Crear Usuario" onSubmit={handleSubmit} onCancel={onCancel} loading={loading}>
      <UserForm formData={formData} setFormData={setFormData} isEditing={false} />
    </Modal>
  );
};

// Edit User Modal Component
const EditUserModal: React.FC<{
  formData: CreateUserRequest;
  setFormData: (data: CreateUserRequest) => void;
  onSubmit: () => void;
  onCancel: () => void;
}> = ({ formData, setFormData, onSubmit, onCancel }) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    await onSubmit();
    setLoading(false);
  };

  return (
    <Modal title="Editar Usuario" onSubmit={handleSubmit} onCancel={onCancel} loading={loading}>
      <UserForm formData={formData} setFormData={setFormData} isEditing={true} />
    </Modal>
  );
};

// Generic Modal Component
const Modal: React.FC<{
  title: string;
  children: React.ReactNode;
  onSubmit: () => void;
  onCancel: () => void;
  loading?: boolean;
}> = ({ title, children, onSubmit, onCancel, loading = false }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        </div>
        <div className="p-6">
          {children}
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
            <span>{loading ? 'Guardando...' : 'Guardar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// User Form Component
const UserForm: React.FC<{
  formData: CreateUserRequest;
  setFormData: (data: CreateUserRequest) => void;
  isEditing: boolean;
}> = ({ formData, setFormData, isEditing }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Apellido</label>
          <input
            type="text"
            name="apellido"
            value={formData.apellido}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
        <input
          type="text"
          name="username"
          value={formData.username}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Contraseña {isEditing && '(dejar vacío para mantener actual)'}
        </label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          required={!isEditing}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="user">Usuario</option>
          <option value="admin">Administrador</option>
        </select>
      </div>
    </div>
  );
};