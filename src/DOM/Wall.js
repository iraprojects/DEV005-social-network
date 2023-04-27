import {
  collection, addDoc, doc, getDoc, updateDoc, deleteDoc, arrayUnion, onSnapshot, orderBy, query,
} from 'firebase/firestore';

import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/index.js';
import { WallTemplate } from '../templates/wallTemplate.js';

export const Wall = (onNavigate) => {
  const body = document.querySelector('body');
  body.className = 'wallBody';
  const div = document.createElement('div');
  div.innerHTML = WallTemplate;
  // const errorMsj = div.querySelector('#errorMsj');
  const divPost = div.querySelector('.posts');
  const iPost = div.querySelector('#iPost');
  const btnPost = div.querySelector('#btn-post');
  let editStatus = false;
  let idPost = '';

  // const getDocument = () => getDocs(collection(db, 'posts'));
  const getPost = (id) => getDoc(doc(db, 'posts', id));
  const updatePost = (id, newField) => updateDoc(doc(db, 'posts', id), newField);
  const deletePosts = (id) => deleteDoc(doc(db, 'posts', id));
  const realTime = (callback) => onSnapshot(query(collection(db, 'posts'), orderBy('date', 'desc')), callback);
  // valida si el usuario es igual que el correo
  const checkUser = (data) => {
    const user = data.data().Author;
    const userEmail = auth.currentUser.email;
    if (user === userEmail) {
      return true;
    }
    return false;
  };

  // borra posts
  const deleting = (content) => {
    const deletePost = content.querySelectorAll('#btn-delete');
    deletePost.forEach((btn) => {
      btn.addEventListener('click', ({ target: { dataset } }) => {
        deletePosts(dataset.id);
      });
    });
  };

  // edita posts
  const editPost = (content) => {
    const btnEdit = content.querySelectorAll('#btn-edit');
    btnEdit.forEach((element) => element.addEventListener('click', async (e) => {
      btnPost.textContent = 'Guardar';
      const docu = await getPost(e.target.dataset.id);
      console.log(docu);
      if (checkUser(docu)) {
        console.log('El user ES autor del post');
        iPost.value = docu.data().Post;
        idPost = docu.id;
        editStatus = true;
      } else {
        console.log('el user No es el autor del post');
        iPost.value = '';
        editStatus = false;
      }
    }));
  };

  const LikeAndCount = (content) => {
    content.addEventListener('click', async (event) => {
      if (event.target.matches('#btn-like')) {
        // Agrega la clase "liked" al elemento contenedor
        event.currentTarget.classList.toggle('liked');
        // Se obtiene la referencia del documento del post y la información de "me gusta" actual
        const postRef = doc(db, 'posts', event.target.dataset.id);
        const postSnap = await getDoc(postRef);
        const post = postSnap.data();
        const likedBy = post.likedBy || [];
        // Verifica si el usuario actual ya ha dado "me gusta" a esta publicación
        const currentUser = auth.currentUser;
        if (likedBy.includes(currentUser.email)) {
          console.log('a la usuaria ya le gusta esta publicación');
        } else {
          // Agrega el identificador de la usuaria a la lista de "me gusta"
          await updateDoc(postRef, {
            likedBy: arrayUnion(currentUser.email),
          });
          const newCount = likedBy.length + 1;
          console.log('contador de likes:', newCount);
        }
      }
    });
  };
  // valida que el usuario inicie sesion
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      /* const getAllPosts = await getDocument(); */
      realTime((data) => {
        let html = '';
        data.forEach((docu) => {
          const post = docu.data();
          let li = '';
          const author = post.Author.split('@')[0];
          if (checkUser(docu)) {
            li = `
            <div class="container-liPost">
              <li class='liPost'> 
                <p class="author"><b>${author}</b></p>
                ${post.Post}
                <span class="post-likes">${post.likedBy.length} Me gusta</span>
                <buttom class="btn-class" id="btn-edit" data-id="${docu.id}">Editar</buttom>
                <button class="btn-class" id='btn-delete' data-id="${docu.id}">Eliminar</button>
              </li>
            </div>
            `;
          } else {
            li = `
            <div class="container-liPost">
              <li class='liPost'> 
                <p class="author"><b>${author}</b></p>
                ${post.Post}
                <button class="btn-class" id='btn-like' data-id="${docu.id}">♥</button>
                <span class="post-likes">${post.likedBy.length} Me gusta</span>
              </li>
            </div>
            `;
          }
          html += li;
        });
        divPost.innerHTML = html;
        editPost(div);
        deleting(div);
        LikeAndCount(div, doc.id);
      });
    } else {
      console.log('No se ha iniciado sesion');
      onNavigate('/');
    }
  });

  // Crea posts
  const crearPost = async (contenido) => {
    try {
      const docRef = await addDoc(collection(db, 'posts'), {
        Post: contenido,
        Author: auth.currentUser.email,
        likedBy: [],
        date: Date.now(),
      });
      console.log('Document written with ID: ', docRef.id);
    } catch (e) {
      console.error('Error adding document: ', e);
    }
  };

  // Crea el post en la base de datos
  const btnOut = div.querySelector('#btn-out');
  // const currentUser = auth.currentUser;
  btnPost.addEventListener('click', () => {
    const contenido = iPost.value.trim();
    if (editStatus) {
      btnPost.textContent = 'Publicar';
      console.log('post editado');
      updatePost(idPost, { Post: iPost.value, Author: auth.currentUser.email });
      editStatus = false;
    } else if (contenido !== '') {
      crearPost(contenido);
    }
    iPost.value = '';
  });

  // salir de sesion
  btnOut.addEventListener('click', async () => {
    await signOut(auth);
    onNavigate('/');
  });

  return div;
};
