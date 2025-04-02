<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */

     public function boot()
     {
         // Force HTTPS regardless of environment if we're on the production domain
         if (str_contains(request()->getHost(), 'railway.app')) {
             URL::forceScheme('https');
             $this->app['request']->server->set('HTTPS', 'on');
         }
     }
}
