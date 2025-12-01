<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateBranchesTable extends Migration
{
    public function up()
    {
        Schema::create('branches', function (Blueprint $table) {
            $table->id();

            // Foreign key to clients table
            $table->unsignedBigInteger('client_id');

            $table->string('branch_name');

            // Username must be unique per client
            $table->string('username');

            // Store hashed password
            $table->string('password');

            $table->timestamps();

            // FK constraint (adjust table if needed)
            $table->foreign('client_id')
                  ->references('id')
                  ->on('clients')
                  ->onDelete('cascade');

            // To support Laravel validation rule:
            // Rule::unique('branches')->where('client_id', $client->id)
            $table->unique(['client_id', 'username']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('branches');
    }
}
