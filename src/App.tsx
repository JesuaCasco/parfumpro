import { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import type { Product, ProductType, Sale } from './types';
import type { Session } from '@supabase/supabase-js';

const initialProduct = {
  name: '',
  brand: '',
  type: 'perfume' as ProductType,
  volume: '50 ml',
  price: 0,
  stock: 0,
};

const initialSale = {
  product_id: '',
  quantity: 1,
};

const initialRestock = {
  product_id: '',
  amount: 1,
};

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [productForm, setProductForm] = useState(initialProduct);
  const [saleForm, setSaleForm] = useState(initialSale);
  const [restockForm, setRestockForm] = useState(initialRestock);
  const [productFilter, setProductFilter] = useState<'all' | ProductType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [reportRange, setReportRange] = useState<'all' | '7' | '30'>('all');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((item) => item.id === Number(saleForm.product_id)),
    [products, saleForm.product_id]
  );

  const selectedRestock = useMemo(
    () => products.find((item) => item.id === Number(restockForm.product_id)),
    [products, restockForm.product_id]
  );

  const saleTotal = useMemo(() => {
    if (!selectedProduct) return 0;
    return selectedProduct.price * saleForm.quantity;
  }, [selectedProduct, saleForm.quantity]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesType = productFilter === 'all' || product.type === productFilter;
      const matchesTerm = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesType && matchesTerm;
    });
  }, [products, productFilter, searchTerm]);

  const filteredSales = useMemo(() => {
    if (reportRange === 'all') return sales;
    const days = Number(reportRange);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return sales.filter((sale) => new Date(sale.sold_at) >= cutoff);
  }, [sales, reportRange]);

  const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalItemsSold = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0);
  const totalSales = filteredSales.length;
  const bestSeller = useMemo(() => {
    const counts = filteredSales.reduce<Record<string, number>>((acc, sale) => {
      acc[sale.product_name] = (acc[sale.product_name] ?? 0) + sale.quantity;
      return acc;
    }, {});

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A';
  }, [filteredSales]);

  useEffect(() => {
    initializeAuth();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadProducts();
        loadSales();
      } else {
        setProducts([]);
        setSales([]);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function initializeAuth() {
    const { data } = await supabase.auth.getSession();
    setSession(data.session);
    if (data.session) {
      loadProducts();
      loadSales();
    }
  }

  async function loadProducts() {
    setLoading(true);
    const { data, error } = await supabase.from('productos').select('*').order('id', { ascending: true });
    if (error) {
      setMessage(`Error cargando productos: ${error.message}`);
    } else {
      setProducts((data ?? []) as Product[]);
    }
    setLoading(false);
  }

  async function loadSales() {
    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .order('sold_at', { ascending: false });

    if (error) {
      setMessage(`Error cargando ventas: ${error.message}`);
    } else {
      setSales((data ?? []) as Sale[]);
    }
  }

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(`Error de acceso: ${error.message}`);
    } else {
      setMessage('Inicio de sesión correcto.');
      setEmail('');
      setPassword('');
    }
    setLoading(false);
  }

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setMessage(`Error creando cuenta: ${error.message}`);
    } else {
      setMessage('Cuenta creada. Revisa tu correo para verificar el acceso.');
      setEmail('');
      setPassword('');
    }
    setLoading(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setSession(null);
    setProducts([]);
    setSales([]);
    setMessage('Has cerrado sesión.');
  }

  async function handleAddProduct(event: React.FormEvent) {
    event.preventDefault();
    if (!session) {
      setMessage('Necesitas iniciar sesión para agregar productos.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.from('productos').insert([productForm]).select();
    if (error) {
      setMessage(`Error guardando producto: ${error.message}`);
    } else {
      setProducts((prev) => [...prev, ...(data ?? [])]);
      setProductForm(initialProduct);
      setMessage('Producto agregado correctamente.');
    }
    setLoading(false);
  }

  async function handleAddSale(event: React.FormEvent) {
    event.preventDefault();
    if (!session) {
      setMessage('Necesitas iniciar sesión para registrar ventas.');
      return;
    }

    if (!selectedProduct) {
      setMessage('Selecciona un producto válido para registrar la venta.');
      return;
    }

    if (saleForm.quantity <= 0 || saleForm.quantity > selectedProduct.stock) {
      setMessage('Cantidad inválida o no hay stock suficiente.');
      return;
    }

    setLoading(true);
    const newSale = {
      product_id: selectedProduct.id,
      product_name: selectedProduct.name,
      quantity: saleForm.quantity,
      total: saleTotal,
      sold_at: new Date().toISOString(),
    };

    const { error: saleError } = await supabase.from('ventas').insert([newSale]);
    const { error: updateError } = await supabase
      .from('productos')
      .update({ stock: selectedProduct.stock - saleForm.quantity })
      .eq('id', selectedProduct.id);

    if (saleError || updateError) {
      setMessage(`Error guardando venta: ${saleError?.message ?? updateError?.message}`);
    } else {
      setMessage('Venta registrada correctamente.');
      setSaleForm(initialSale);
      loadProducts();
      loadSales();
    }
    setLoading(false);
  }

  async function handleRestock(event: React.FormEvent) {
    event.preventDefault();
    if (!session) {
      setMessage('Necesitas iniciar sesión para actualizar stock.');
      return;
    }

    if (!selectedRestock) {
      setMessage('Selecciona un producto para reabastecer.');
      return;
    }

    if (restockForm.amount <= 0) {
      setMessage('La cantidad de reabastecimiento debe ser mayor a cero.');
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from('productos')
      .update({ stock: selectedRestock.stock + restockForm.amount })
      .eq('id', selectedRestock.id);

    if (error) {
      setMessage(`Error actualizando stock: ${error.message}`);
    } else {
      setMessage('Stock actualizado correctamente.');
      setRestockForm(initialRestock);
      loadProducts();
    }
    setLoading(false);
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 2,
    }).format(value);
  }

  if (!session) {
    return (
      <div className="container">
        <header className="card">
          <h1>ParfumPro</h1>
          <p className="small">Inicia sesión o crea una cuenta para acceder a tu sistema.</p>
        </header>

        {message ? <div className="card alert">{message}</div> : null}

        <section className="card">
          <h2>Acceso</h2>
          <form className="grid auth-grid" onSubmit={handleSignIn}>
            <div>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            <div>
              <label>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div className="auth-actions">
              <button type="submit" disabled={loading}>
                Iniciar sesión
              </button>
              <button type="button" onClick={handleSignUp} disabled={loading}>
                Crear cuenta
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="container">
      <header className="card">
        <div className="header-row">
          <div>
            <h1>ParfumPro</h1>
            <p className="small">Gestión personal de ventas de perfumes y decants con Supabase.</p>
          </div>
          <div>
            <button onClick={handleSignOut} disabled={loading}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {message ? <div className="card alert">{message}</div> : null}

      <section className="card">
        <h2>Reportes</h2>
        <div className="grid grid-2">
          <div>
            <label>Rango</label>
            <select value={reportRange} onChange={(event) => setReportRange(event.target.value as 'all' | '7' | '30')}>
              <option value="all">Todo el historial</option>
              <option value="30">Últimos 30 días</option>
              <option value="7">Últimos 7 días</option>
            </select>
          </div>
        </div>

        <div className="summary-grid">
          <div className="card summary-card">
            <strong>Ingresos</strong>
            <p>{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="card summary-card">
            <strong>Ventas</strong>
            <p>{totalSales}</p>
          </div>
          <div className="card summary-card">
            <strong>Unidades</strong>
            <p>{totalItemsSold}</p>
          </div>
          <div className="card summary-card">
            <strong>Top producto</strong>
            <p>{bestSeller}</p>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Agregar producto</h2>
        <form onSubmit={handleAddProduct} className="grid grid-2">
          <div>
            <label>Nombre</label>
            <input
              value={productForm.name}
              onChange={(event) => setProductForm({ ...productForm, name: event.target.value })}
              required
            />
          </div>
          <div>
            <label>Marca</label>
            <input
              value={productForm.brand}
              onChange={(event) => setProductForm({ ...productForm, brand: event.target.value })}
            />
          </div>
          <div>
            <label>Tipo</label>
            <select
              value={productForm.type}
              onChange={(event) => setProductForm({ ...productForm, type: event.target.value as ProductType })}
            >
              <option value="perfume">Perfume</option>
              <option value="decant">Decant</option>
            </select>
          </div>
          <div>
            <label>Volumen</label>
            <input
              value={productForm.volume}
              onChange={(event) => setProductForm({ ...productForm, volume: event.target.value })}
            />
          </div>
          <div>
            <label>Precio</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={productForm.price}
              onChange={(event) => setProductForm({ ...productForm, price: Number(event.target.value) })}
              required
            />
          </div>
          <div>
            <label>Stock</label>
            <input
              type="number"
              min="0"
              value={productForm.stock}
              onChange={(event) => setProductForm({ ...productForm, stock: Number(event.target.value) })}
              required
            />
          </div>
          <div>
            <button type="submit" disabled={loading}>
              Guardar producto
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Registrar venta</h2>
        <form onSubmit={handleAddSale} className="grid grid-2">
          <div>
            <label>Producto</label>
            <select
              value={saleForm.product_id}
              onChange={(event) => setSaleForm({ ...saleForm, product_id: event.target.value })}
              required
            >
              <option value="">Selecciona un producto</option>
              {products.map((product) => (
                <option key={product.id} value={product.id.toString()}>
                  {product.name} ({product.brand || 'sin marca'}) - {formatCurrency(product.price)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Cantidad</label>
            <input
              type="number"
              min="1"
              value={saleForm.quantity}
              onChange={(event) => setSaleForm({ ...saleForm, quantity: Number(event.target.value) })}
              required
            />
          </div>
          <div>
            <p className="small">Total estimado: {formatCurrency(saleTotal)}</p>
          </div>
          <div>
            <button type="submit" disabled={loading}>
              Guardar venta
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <h2>Reabastecer stock</h2>
        <form onSubmit={handleRestock} className="grid grid-2">
          <div>
            <label>Producto</label>
            <select
              value={restockForm.product_id}
              onChange={(event) => setRestockForm({ ...restockForm, product_id: event.target.value })}
              required
            >
              <option value="">Selecciona un producto</option>
              {products.map((product) => (
                <option key={product.id} value={product.id.toString()}>
                  {product.name} ({product.type})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>Cantidad</label>
            <input
              type="number"
              min="1"
              value={restockForm.amount}
              onChange={(event) => setRestockForm({ ...restockForm, amount: Number(event.target.value) })}
              required
            />
          </div>
          <div>
            <div className="small">Stock actual: {selectedRestock?.stock ?? '-'}</div>
          </div>
          <div>
            <button type="submit" disabled={loading}>
              Reabastecer
            </button>
          </div>
        </form>
      </section>

      <section className="card">
        <div className="header-row">
          <div>
            <h2>Inventario</h2>
            <p className="small">Filtra por tipo o busca por nombre y marca.</p>
          </div>
          <div>
            <label>Tipo</label>
            <select value={productFilter} onChange={(event) => setProductFilter(event.target.value as 'all' | ProductType)}>
              <option value="all">Todos</option>
              <option value="perfume">Perfume</option>
              <option value="decant">Decant</option>
            </select>
          </div>
          <div>
            <label>Buscar</label>
            <input
              type="search"
              placeholder="Nombre o marca"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <p className="small">No hay productos que coincidan con el filtro.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Marca</th>
                <th>Tipo</th>
                <th>Volumen</th>
                <th>Precio</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className={product.stock <= 5 ? 'low-stock' : ''}>
                  <td>{product.id}</td>
                  <td>{product.name}</td>
                  <td>{product.brand || '—'}</td>
                  <td>{product.type}</td>
                  <td>{product.volume}</td>
                  <td>{formatCurrency(product.price)}</td>
                  <td>{product.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card">
        <h2>Historial de ventas</h2>
        {sales.length === 0 ? (
          <p className="small">No hay ventas registradas.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Total</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{sale.id}</td>
                  <td>{sale.product_name}</td>
                  <td>{sale.quantity}</td>
                  <td>{formatCurrency(sale.total)}</td>
                  <td>{new Date(sale.sold_at).toLocaleString('es-ES')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default App;
