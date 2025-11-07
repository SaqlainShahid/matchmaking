import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import RequestList from '../../components/RequestList';

const Requests = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: 'var(--text-dark)' }}>My Requests</h1>
        <Button onClick={() => navigate('/requests/new')}>
          New Request
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <RequestList />
        </CardContent>
      </Card>
    </div>
  );
};

export default Requests;