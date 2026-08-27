"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import DynamicIntakeForm from "@/components/DynamicIntakeForm";
import SlideOverPanel from "../../components/SlideOverPanel";
import { useRouter } from "next/navigation";
import TableSkeleton from "../../components/skeletons/TableSkeleton";
import DynamicModuleView from "@/components/DynamicModuleView";
import EntityEditModal from "@/components/EntityEditModal";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [blueprint, setBlueprint] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [tags, setTags] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [pendingTransition, setPendingTransition] = useState(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { getCurrentUser } = await import('aws-amplify/auth');
      await getCurrentUser();
      fetchData();
    } catch (err) {
      router.push('/sign-in');
    }
  };

  const getAuthToken = async () => {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const { tokens } = await fetchAuthSession();
    return tokens.idToken.toString();
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const token = await getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch User Profile
      const meRes = await fetch('/api/me', { headers });
      const meData = await meRes.json();
      setCurrentUser(meData);

      const bpRes = await fetch('/api/blueprint?moduleType=Product', { headers });
      if (bpRes.ok) setBlueprint(await bpRes.json());

      const tagsRes = await fetch('/api/tags?moduleType=Product', { headers });
      if (tagsRes.ok) setTags(await tagsRes.json());

      const res = await fetch('/api/products', { headers });
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error("Failed to load products", err);
    } finally {
      setIsLoading(false);
    }
  };
  const handleProductUpdate = (updatedProduct) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    if (selectedProduct && selectedProduct.id === updatedProduct.id) {
      setSelectedProduct(updatedProduct);
    }
  };

  const handleTransition = async (productId, toStageId, customData, transitionId) => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          productId,
          stageId: toStageId,
          customData,
          transitionId
        })
      });
      if (res.ok) {
        const updated = await res.json();
        handleProductUpdate(updated);
        setSelectedProduct(null);
        setPendingTransition(null);
      } else {
        const err = await res.json();
        alert("Transition failed: " + err.error);
      }
    } catch (e) {
      console.error("Transition failed", e);
    }
  };


  const handleAddProduct = async (newPayload) => {
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newPayload)
      });
      if (res.ok) {
        const savedProduct = await res.json();
        setProducts((prev) => [savedProduct, ...prev]);
      } else {
        const err = await res.json();
        alert("Error: " + err.error);
      }
    } catch (err) {
      console.error("Failed to save product", err);
      alert("Failed to create product.");
    }
  };

  return (
    <>

      <main className="dashboard-main">

        <div className="module-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {isLoading ? (
            <div className="p-8 text-center" style={{ margin: 'auto' }}>
              <TableSkeleton />
            </div>
          ) : (
            <DynamicModuleView
              moduleName="Product"
              records={products}
              blueprint={blueprint}
              supportKanban={false}
              onRecordClick={(product) => setSelectedProduct(product)}
              renderHeaderActions={() => (
                <button className="btn-primary" onClick={() => setIsFormOpen(true)} style={{ whiteSpace: 'nowrap' }}>
                  + Add Product
                </button>
              )}
            />
          )}
        </div>
      </main>

      <DynamicIntakeForm
        moduleType="Product"
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleAddProduct}
      />

      <SlideOverPanel
        isOpen={!!selectedProduct}
        onClose={() => {
          setSelectedProduct(null);
          setPendingTransition(null);
        }}
        lead={selectedProduct}
        blueprint={blueprint}
        tags={tags}
        currentUser={currentUser}
        onTransition={handleTransition}
        onLeadUpdate={handleProductUpdate}
        pendingTransition={pendingTransition}
        onEditClick={() => setIsEditModalOpen(true)}
      />

      <EntityEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        entity={selectedProduct}
        blueprint={blueprint}
        onUpdate={handleProductUpdate}
        currentUser={currentUser}
        moduleName="Products"
      />

    </>
  );
}
