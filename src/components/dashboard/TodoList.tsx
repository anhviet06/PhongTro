/**
 * Checklist việc cần làm hôm nay trên Dashboard.
 */

import { useState } from 'react';
import { Check, ListPlus, Trash2 } from 'lucide-react';

interface TodoItem {
   id: number;
   text: string;
   due: string;
   priority: 'Cao' | 'Vừa' | 'Thấp';
   done: boolean;
}

const initialTodos: TodoItem[] = [
   { id: 1, text: 'Kiểm tra công nợ quá hạn', due: 'Hôm nay', priority: 'Cao', done: false },
   { id: 2, text: 'Nhập chỉ số điện nước', due: 'Cuối ngày', priority: 'Vừa', done: false },
   { id: 3, text: 'Rà hợp đồng sắp hết hạn', due: 'Tuần này', priority: 'Thấp', done: false },
];

export default function TodoList() {
   const [todos, setTodos] = useState<TodoItem[]>(initialTodos);

   const toggleTodo = (id: number) => {
      setTodos((items) =>
         items.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
      );
   };

   const removeTodo = (id: number) => {
      setTodos((items) => items.filter((item) => item.id !== id));
   };

   const addTodo = () => {
      const nextId = Math.max(0, ...todos.map((item) => item.id)) + 1;
      setTodos((items) => [
         ...items,
         {
            id: nextId,
            text: 'Công việc mới',
            due: 'Hôm nay',
            priority: 'Vừa',
            done: false,
         },
      ]);
   };

   return (
      <section className="rounded-lg border border-outline-variant bg-surface-container-lowest p-md shadow-sm">
         <div className="mb-md flex items-center justify-between gap-md">
            <div>
               <h3 className="text-headline-sm text-on-surface">Việc cần làm hôm nay</h3>
               <p className="text-body-md text-on-surface-variant">Các việc vận hành cần chú ý</p>
            </div>
         </div>

         <div className="space-y-sm">
            {todos.map((todo) => (
               <div
                  key={todo.id}
                  className="group flex items-center gap-sm rounded-lg border border-outline-variant bg-surface-container-low p-sm"
               >
                  <button
                     type="button"
                     onClick={() => toggleTodo(todo.id)}
                     className={[
                        'focus-ring grid h-7 w-7 shrink-0 place-items-center rounded-full border',
                        todo.done
                           ? 'border-secondary bg-secondary text-on-secondary'
                           : 'border-outline bg-surface-container-lowest',
                     ].join(' ')}
                     title="Đánh dấu"
                  >
                     {todo.done && <Check className="h-4 w-4" />}
                  </button>

                  <div className="min-w-0 flex-1">
                     <p
                        className={[
                           'truncate text-body-md font-medium',
                           todo.done ? 'text-on-surface-variant line-through' : 'text-on-surface',
                        ].join(' ')}
                     >
                        {todo.text}
                     </p>
                     <div className="mt-xs flex flex-wrap items-center gap-xs text-label-sm text-on-surface-variant">
                        <span>{todo.due}</span>
                        <span className="rounded-full bg-surface-container-high px-xs">
                           {todo.priority}
                        </span>
                     </div>
                  </div>

                  <button
                     type="button"
                     onClick={() => removeTodo(todo.id)}
                     className="focus-ring grid h-8 w-8 place-items-center rounded-full text-on-surface-variant opacity-0 transition hover:bg-error-container hover:text-on-error-container group-hover:opacity-100"
                     title="Xóa"
                  >
                     <Trash2 className="h-4 w-4" />
                  </button>
               </div>
            ))}
         </div>

         <button
            type="button"
            onClick={addTodo}
            className="focus-ring mt-md flex h-10 w-full items-center justify-center gap-sm rounded-lg border border-dashed border-outline text-primary hover:bg-primary-fixed"
         >
            <ListPlus className="h-5 w-5" />
            <span>Thêm công việc</span>
         </button>
      </section>
   );
}
