<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use MongoDB\Client;

class HashPasswords extends Command
{
    protected $signature = 'medibuddy:hash-passwords';

    protected $description = 'Bcrypt-hash every utilisateur.password that is not already a bcrypt hash, and drop the stray "hash" field';

    public function handle(): int
    {
        $client = new Client(env('MONGO_DSN', 'mongodb://localhost:27017'));
        $users = $client->selectDatabase(env('MONGO_DB', 'MEDIBuddy'))->selectCollection('utilisateur');

        $hashed = 0;
        $skipped = 0;
        $cleaned = 0;

        foreach ($users->find() as $user) {
            $set = [];
            $unset = [];

            $password = $user['password'] ?? null;
            if (is_string($password) && $password !== '' && !str_starts_with($password, '$2y$')) {
                $set['password'] = Hash::make($password);
                $hashed++;
            } else {
                $skipped++;
            }
            if (isset($user['hash'])) {
                $unset['hash'] = '';
                $cleaned++;
            }

            $update = [];
            if ($set) {
                $update['$set'] = $set;
            }
            if ($unset) {
                $update['$unset'] = $unset;
            }
            if ($update) {
                $users->updateOne(['_id' => $user['_id']], $update);
            }
        }

        $this->info("Hashed {$hashed} password(s); {$skipped} left as is; removed 'hash' from {$cleaned} user(s).");

        return self::SUCCESS;
    }
}
